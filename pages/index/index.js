const printerServiceUUID = '7E400001-B5A3-F393-E0A9-E50E24DCCA9E';
const printerFreeBufferSizeUUID = '7E400002-B5A3-F393-E0A9-E50E24DCCA9E';
const printerStatusUUID = '7E400003-B5A3-F393-E0A9-E50E24DCCA9E';
const printerImageDataUUID = '7E400006-B5A3-F393-E0A9-E50E24DCCA9E';

Page({
  data: {
    devices: [],
    connectedDevice: null,
    selectedImage: '',
    imageData: null,
    isPrinting: false,
    lineIndex: -1,
    totalLines: -1,
    freeBufferSize: 0,
    waitPrinter: true,
    batteryStatus: '-.-',
    temperatureStatus: '-.-',
    paperStatus: '-.-',
    progressStatus: '-.-',
  },

  // 创建定时器，每隔一段时间读取电池电压
  startReadingPrinterStatus: function () {
    const that = this;

    // 监听蓝牙特征改变事件
    wx.onBLECharacteristicValueChange((result) => {
      if (that.data.isPrinting) {
        that.setData({
          progressStatus: '' + (that.data.lineIndex / that.data.totalLines * 100).toFixed(2) + '%',
        });
      } else {
        that.setData({
          progressStatus: '-.-',
        })
      }

      if (result.characteristicId == printerStatusUUID) {
        const status = new Float32Array(result.value);
        that.setData({
          batteryStatus: status[0].toFixed(2),
          temperatureStatus: status[1].toFixed(2),
          paperStatus: status[2] == 0.0 ? '正常' : '异常',
        });
      } else if (result.characteristicId == printerFreeBufferSizeUUID) {
        const freeBufferSize = new Uint32Array(result.value)[0];
        that.setData({
          freeBufferSize: freeBufferSize,
          waitPrinter: false,
        });
      } else {
        console.log("未知UUID");
      }
    });

    setInterval(function () {
      if (that.data.connectedDevice == null || that.data.connectedDevice == undefined)
        return;

      // 读取打印机状态数据: 电池, 温度, 纸张
      wx.readBLECharacteristicValue({
        deviceId: that.data.connectedDevice.deviceId,
        serviceId: printerServiceUUID,
        characteristicId: printerStatusUUID,
        success: function (res) {
          console.log('读取打印机状态成功');
        },
        fail: function (error) {
          console.log('读取打印机状态失败', error);
        },
      });
    }, 5000);
  },

  onLoad: function () {
    // 在页面加载时启动读取电池电压的定时器
    this.startReadingPrinterStatus();
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
      services: [printerServiceUUID],
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

    var nameIndex = 1;
    const devices = this.data.devices.map(device => {
      var defaultName = "未命名设备" + nameIndex;
      nameIndex += 1;
      return device.name || defaultName;
    });

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
    // 清空之前的选择
    this.setData({
      isPrinting: false,
      selectedImage: '',
      imageData: null,
    });

    // 处理选择图片的逻辑
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['original', 'compressed'],
      sourceType: ['album'],
      success: (res) => {
        const tempFiles = res.tempFiles;
        if (tempFiles.length > 0) {
          this.setData({
            selectedImage: tempFiles[0].tempFilePath,
          });
          wx.showToast({
            title: '选择图片成功',
            icon: 'success'
          })
        }
      },
      fail: (error) => {
        wx.showToast({
          title: '选择图片失败',
          icon: 'error',
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
        wx.showToast({
          title: '图片预处理失败',
          icon: 'error',
        })
      });
    }

    this.sendDataToPrinter();

  },

  // 发送数据到打印机
  sendDataToPrinter: function () {

    if (this.data.imageData == null) {
      wx.showToast({
        title: '图片处中...',
        icon: 'loading'
      })
      return;
    }

    if (this.data.isPrinting) {
      wx.showToast({
        title: '打印中...',
        icon: 'none',
      })
      return;
    }

    this.setData({
      isPrinting: true,
    });

    const device = this.data.connectedDevice;
    const deviceId = device.deviceId;

    wx.readBLECharacteristicValue({
      deviceId: deviceId,
      serviceId: printerServiceUUID,
      characteristicId: printerFreeBufferSizeUUID,
      success: function (res) {
        console.log('读取free buffer size成功');
      },
      fail: function (error) {
        console.log('读取free buffer size失败', error);
        this.setData({
          freeBufferSize: 0,
        });
      },
    });

    while (this.data.lineIndex < this.data.totalLines) {

      const maxSize = 10;
      const currentLineIndex = this.data.lineIndex;

      console.log("before sending loop");
      for (let num = 0; num < maxSize; num++) {
        console.log("inside sending loop");
        const currentLine = this.data.imageData.slice((currentLineIndex + num) * 384, (currentLineIndex + num + 1) * 384);
        const printData = new Uint8ClampedArray(48);

        for (let i = 0; i < 384; i += 1) {
          var brightness = currentLine[i];
          brightness = brightness >= 128 ? 0 : 1;

          var index = Math.round(i / 8);
          var shift = i % 8;
          brightness = brightness << shift;

          printData[index] = printData[index] | brightness;
        }

        wx.writeBLECharacteristicValue({
          characteristicId: '7E400006-B5A3-F393-E0A9-E50E24DCCA9E',
          deviceId: deviceId,
          serviceId: '7E400001-B5A3-F393-E0A9-E50E24DCCA9E',
          value: printData.buffer,
          success: res => {
            console.log("send ok");
          },
          fail: res => {
            console.log(res);
          }
        });
      }

      this.setData({
        lineIndex: currentLineIndex + maxSize,
        waitPrinter: true,
      });

      wx.readBLECharacteristicValue({
        deviceId: deviceId,
        serviceId: printerServiceUUID,
        characteristicId: printerFreeBufferSizeUUID,
        success: function (res) {
          console.log('读取free buffer size成功');
        },
        fail: function (error) {
          console.log('读取free buffer size失败', error);
          this.setData({
            freeBufferSize: 0,
          });
        },
      });
    }

    this.setData({
      isPrinting: false,
      lineIndex: 0,
      totalLines: 0,
      freeBufferSize: 0,
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

        this.setData({
          totalLines: height,
        });

        // 使用 canvas 进行缩放和灰度处理
        const ctx = wx.createCanvasContext('imageCanvas');
        ctx.drawImage(imagePath, 0, 0, info.width, info.height, 0, 0, info.width, info.height);
        ctx.draw(false, () => {
          // 获取处理后的图像数据
          wx.canvasGetImageData({
            canvasId: 'imageCanvas',
            x: 0,
            y: 0,
            width: info.width,
            height: info.height,
            success: (res) => {
              // 处理图像数据为灰度图像
              for (let i = 0; i < res.data.length; i += 4) {
                const grayValue = 0.299 * res.data[i] + 0.587 * res.data[i + 1] + 0.114 * res.data[i + 2];
                res.data[i] = grayValue;
                res.data[i + 1] = grayValue;
                res.data[i + 2] = grayValue;
              }

              const image_buffer = new Uint8ClampedArray(width * height);

              for (let i = 0; i < width; i++) {
                for (let j = 0; j < height; j++) {
                  var src_i = Math.round(i * info.width / width);
                  var src_j = Math.round(j * info.height / height);

                  var s = 0;
                  var count = 0;
                  for (let ii = src_i - 1; ii <= src_i + 1; ii++) {
                    for (let jj = src_j - 1; jj <= src_j + 1; jj++) {
                      if (ii >= 0 && ii < info.width && jj >= 0 && jj < info.height) {
                        s += res.data[jj * info.width * 4 + ii * 4];
                        count++;
                      }
                    }
                  }

                  image_buffer[j * width + i] = Math.round(s / count);
                }
              }

              // 调用成功回调并传递处理后的图像数据
              successCallback(image_buffer);
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