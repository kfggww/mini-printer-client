Page({
  data: {
    devices: [],
    connectedDevice: null,
    selectedImage: '',
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
  },
})