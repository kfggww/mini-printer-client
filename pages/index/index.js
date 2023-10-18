Page({
  data: {
    devices: [],
    connectedDevice: null,
    selectedImage: '',
    imageData: null,
    isPrinting: false,
    lineIndex: -1,
  },

  scanDevices: function () {
    wx.openBluetoothAdapter({
      success: (res) => {
        // 蓝牙适配器初始化成功
        this.startBluetoothDevicesDiscovery();
      },
      fail: (error) => {
        wx.showToast({
          title: '蓝牙初始化失败',
          icon: 'none',
        });
      },
    });
  },

  startBluetoothDevicesDiscovery: function () {
    wx.startBluetoothDevicesDiscovery({
      success: (res) => {
        // 监听设备发现事件
        wx.onBluetoothDeviceFound((res) => {
          const deviceList = this.data.devices;
          for (let i = 0; i < res.devices.length; i++) {
            deviceList.push(res.devices[i]);
          }
          this.setData({
            devices: deviceList,
          })
        });

        wx.showToast({
          title: '开始扫描设备',
          icon: 'none',
        });

        setTimeout(() => {
          this.stopBluetoothDevicesDiscovery();
        }, 60000); // 停止扫描设备，这里设置60秒后停止扫描
      },
      fail: (error) => {
        wx.showToast({
          title: '扫描设备失败',
          icon: 'none',
        });
      },
    });
  },

  stopBluetoothDevicesDiscovery: function () {
    wx.stopBluetoothDevicesDiscovery({
      success: (res) => {
        wx.showToast({
          title: '停止扫描设备',
          icon: 'none',
        });
      },
      fail: (error) => {
        wx.showToast({
          title: '停止扫描失败',
          icon: 'none',
        });
      },
    });
  },

  connectDevice: function () {
    // 处理连接设备的逻辑
    // 如果没有扫描到设备，不执行连接操作
    if (this.data.devices.length === 0) {
      wx.showToast({
        title: '未发现可连接设备',
        icon: 'none',
      });
      return;
    }

    const devices = this.data.devices.map(device => device.name || '未命名设备');
    wx.showActionSheet({
      itemList: devices.slice(0, 6),
      success: (res) => {
        if (res.tapIndex !== -1) {
          const selectedDevice = this.data.devices[res.tapIndex];
          this.connectToSelectedDevice(selectedDevice);
        }
      },
      fail: (error) => {
        wx.showToast({
          title: '设备选择失败',
          icon: 'none',
        });
      },
    });
  },

  connectToSelectedDevice: function (device) {
    wx.createBLEConnection({
      deviceId: device.deviceId,
      success: (res) => {
        // 连接成功，设置当前连接设备
        this.setData({
          connectedDevice: device,
        });

        wx.showToast({
          title: '连接成功',
          icon: 'success',
        });
      },
      fail: (error) => {
        wx.showToast({
          title: '连接失败',
          icon: 'none',
        });
      },
    });
  },

  disconnectDevice: function () {
    // 处理断开连接的逻辑
    const connectedDevice = this.data.connectedDevice;
    if (connectedDevice) {
      wx.closeBLEConnection({
        deviceId: connectedDevice.deviceId,
        success: (res) => {
          // 断开连接成功
          this.setData({
            connectedDevice: null,
          });

          wx.showToast({
            title: '断开连接成功',
            icon: 'success',
          });
        },
        fail: (error) => {
          wx.showToast({
            title: '断开连接失败',
            icon: 'none',
          });
        },
      });
    } else {
      wx.showToast({
        title: '未连接设备',
        icon: 'none',
      });
    }
  },

  chooseImage: function () {
    // 处理选择图片的逻辑
    wx.chooseMedia({
      count: 1, // 限制用户只能选择一张图片
      mediaType: ['image'],
      sizeType: ['original', 'compressed'], // 可以选择原图或压缩图
      sourceType: ['album'], // 只允许从相册中选择图片
      success: (res) => {
        const tempFiles = res.tempFiles;
        if (tempFiles.length > 0) {
          this.setData({
            selectedImage: tempFiles[0].tempFilePath,
          });
          console.log("图片路径: ", this.data.selectedImage);
        }
      },
      fail: (error) => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'none',
        });
      },
    });
  },

  printImage: function () {
    // 处理打印图片的逻辑
    const imagePath = this.data.selectedImage;

    if (this.data.isPrinting == false) {
      this.processImage(imagePath, (processedData) => {
        this.setData({
          imageData: processedData,
          lineIndex: 0,
        });
      }, (error) => {
        console.log(error);
      });
    }

    this.sendDataToPrinter();

  },

  // 发送数据到打印机
  sendDataToPrinter: function () {

    if(this.data.imageData == null) {
      console.log("data not ready");
      return;
    }

    console.log("data ready");

    const device = this.data.connectedDevice;
    const deviceId = device.deviceId;

    this.setData({
      isPrinting: true,
    });

    const currentLineIndex = this.data.lineIndex;
    const currentLine = this.data.imageData.data.slice(currentLineIndex * 384 * 4, (currentLineIndex + 1) * 384 * 4);
    const printData = new Uint8ClampedArray(48);

    for(let i = 0; i < 384 * 4; i += 4) {
      var brightness = currentLine[i];
      brightness = brightness >= 128 ? 1 : 0;

      var index = Math.round(i / 32);
      var shift = Math.round(i / 4) % 8;
      brightness = brightness << shift;

      printData[index] = printData[index] | brightness;
    }

    console.log(printData);

    this.setData({
      lineIndex: currentLineIndex + 1,
    })

    // 发送一行数据到打印机
    wx.writeBLECharacteristicValue({
      characteristicId: '6E400002-B5A3-F393-E0A9-E50E24DCCA9E',
      deviceId: deviceId,
      serviceId: '6E400001-B5A3-F393-E0A9-E50E24DCCA9E',
      value: printData.buffer,
      success: res => {
        console.log("send ok");
      },
      fail: res => {
        console.log(res);
      }
    });
  },

  // 处理图片的函数
  processImage: function (imagePath, successCallback, errorCallback) {
    // 获取图像信息
    wx.getImageInfo({
      src: imagePath,
      success: (info) => {
        const width = 384; // 目标宽度
        const height = Math.round((info.height * width) / info.width); // 根据宽高比计算目标高度

        // 使用 canvas 进行缩放和灰度处理
        const ctx = wx.createCanvasContext('imageCanvas');
        ctx.drawImage(imagePath, 0, 0, info.width, info.height, 0, 0, width, height);
        ctx.draw(false, () => {
          // 获取处理后的图像数据
          wx.canvasGetImageData({
            canvasId: 'imageCanvas',
            x: 0,
            y: 0,
            width: width,
            height: height,
            success: (res) => {
              // 处理图像数据为灰度图像
              for (let i = 0; i < res.data.length; i += 4) {
                const grayValue = 0.299 * res.data[i] + 0.587 * res.data[i + 1] + 0.114 * res.data[i + 2];
                res.data[i] = grayValue;
                res.data[i + 1] = grayValue;
                res.data[i + 2] = grayValue;
              }

              // 调用成功回调并传递处理后的图像数据
              successCallback(res);
            },
            fail: (error) => {
              errorCallback(error);
            },
          });
        });
      },
      fail: (error) => {
        errorCallback(error);
      },
    });
  }

})