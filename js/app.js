/*
 * Copyright (c) The DrunKare Team. All rights reserved.
 */
// const WebSocket = require('ws');

const accelerationSensor = tizen.sensorservice.getDefaultSensor("ACCELERATION");
const gyroscopeSensor = tizen.sensorservice.getDefaultSensor("GYROSCOPE");

var globalSensorService;
const nullSensorData = { x: 0.0, y: 0.0, z: 0.0 };
var accelStarttime;
var accelEndtime;
var gyroStarttime;
var gyroEndtime;
/**
 * Store sensor data to sensorService
 * @param sensorType Accelerometer or Gyroscope
 * @param handle A handle to the sensorSorvice
 * @param at Index to store data
 * @param sensorData Expect properties x, y, z
 */
function storeSensorData(sensorType, handle, at, sensorData = nullSensorData) {
	if (!handle instanceof SensorService) {
		return;
	}

	if (!sensorData.hasOwnProperty('x') ||
		!sensorData.hasOwnProperty('y') ||
		!sensorData.hasOwnProperty('z')) {
		return;
	}

	switch (sensorType) {
		case 'a':
			console.log('write a');
			handle.accel_x[at] = sensorData.x;
			handle.accel_y[at] = sensorData.y;
			handle.accel_z[at] = sensorData.z;
			break;
		case 'g':
			console.log('write g');
			handle.gyro_x[at] = sensorData.x;
			handle.gyro_y[at] = sensorData.y;
			handle.gyro_z[at] = sensorData.z;
			break;
		default:
		// Do nothing
	}
}

function onAccelGetSuccess(sensorData) {
	const ai = globalSensorService.accelIndex;
	if (ai === 0) {
		accelStarttime = performance.now();
	}
	storeSensorData('a', globalSensorService, ai, sensorData);
	globalSensorService.accelIndex++;
	console.log(`write a ${ai} ${performance.now()}`);
	if (globalSensorService.accelIndex == globalSensorService.dataSize) {
		globalSensorService.accelReady = true;
		accelEndtime = performance.now();
		globalSensorService.send(globalSensorService.host);
	} else {
		console.log(globalSensorService.interval);
		setTimeout(accelerationSensor.start(onAccelSuccess), globalSensorService.interval);
	}
}

function onAccelError(error) {
	// console.log(`Error occurred: ${error.message}`);
	const ai = globalSensorService.accelIndex;
	storeSensorData('a', globalSensorService, ai);
	globalSensorService.accelIndex++;
	if (globalSensorService.accelIndex == globalSensorService.dataSize) {
		globalSensorService.accelReady = true;
		globalSensorService.send(globalSensorService.host);
	} else {
		console.log(globalSensorService.interval);
		setTimeout(accelerationSensor.start(onAccelSuccess), globalSensorService.interval);
	}
}

function onAccelSuccess() {
	// console.log('Acceleration sensor start');
	accelerationSensor.getAccelerationSensorData(onAccelGetSuccess, onAccelError);
}

function onGyroGetSuccess(sensorData) {
	const gi = globalSensorService.gyroIndex;
	if (gi === 0) {
		gyroStarttime = performance.now();
	}
	storeSensorData('g', globalSensorService, gi, sensorData);
	globalSensorService.gyroIndex++;
	console.log(`write g ${gi} ${performance.now()}`);
	if (globalSensorService.gyroIndex == globalSensorService.dataSize) {
		globalSensorService.gyroReady = true;
		gyroEndtime = performance.now();
		globalSensorService.send(globalSensorService.host);
	} else {
		setTimeout(gyroscopeSensor.start(onGyroSuccess), globalSensorService.interval);
	}
}

function onGyroError(error) {
	const gi = globalSensorService.gyroIndex;
	storeSensorData('g', globalSensorService, gi);
	globalSensorService.gyroIndex++;
	if (globalSensorService.gyroIndex == globalSensorService.dataSize) {
		globalSensorService.gyroReady = true;
		globalSensorService.send(globalSensorService.host);
	} else {
		setTimeout(gyroscopeSensor.start(onGyroSuccess), globalSensorService.interval);
	}
}

function onGyroSuccess() {
	gyroscopeSensor.getGyroscopeSensorData(onGyroGetSuccess, onGyroError);
}

class SensorService {
	constructor(host, gesture, interval = 40, dataSize = 150) {
		this.host = host;
		this.dataSize = dataSize;
		this.accelIndex = 0;
		this.gyroIndex = 0;
		this.accelReady = false;
		this.gyroReady = false;
		this.gesture = gesture;
		this.interval = interval;
		this.accel_x = new Float32Array(this.dataSize);
		this.accel_y = new Float32Array(this.dataSize);
		this.accel_z = new Float32Array(this.dataSize);
		this.gyro_x = new Float32Array(this.dataSize);
		this.gyro_y = new Float32Array(this.dataSize);
		this.gyro_z = new Float32Array(this.dataSize);
	}

	accelStart() {
		accelerationSensor.start(onAccelSuccess);
	}

	gyroStart() {
		gyroscopeSensor.start(onGyroSuccess);
	}

	start() {
		this.accelStart();
		this.gyroStart();
	}

	send() {
		if (!this.accelReady || !this.gyroReady) {
			return;
		}

		// console.log('send');
		for (let i = 0; i < this.dataSize; i++) {
			popup_content.textContent += this.accel_x[i];
			popup_content.textContent += 'ax\n';
			popup_content.textContent += this.accel_y[i];
			popup_content.textContent += 'ay\n';
			popup_content.textContent += this.accel_z[i];
			popup_content.textContent += 'az\n';
			popup_content.textContent += this.gyro_x[i];
			popup_content.textContent += 'gx\n';
			popup_content.textContent += this.gyro_y[i];
			popup_content.textContent += 'gy\n';
			popup_content.textContent += this.gyro_z[i];
			popup_content.textContent += 'gz\n';
		}

		popup_content.textContent += `Accel elapsed time ${accelEndtime - accelStarttime} ms\n`;
		popup_content.textContent += `Gyro elapsed time ${gyroEndtime - gyroStarttime} ms\n`;
	}
}

const popup_content = document.querySelector('.ui-popup-content');

const li_drink = document.getElementById('li-drink');
const li_pour= document.getElementById('li-pour');
const li_clink = document.getElementById('li-clink');
const li_chopstick = document.getElementById('li-chopstick');
const li_spoon =  document.getElementById('li-spoon');
const li_ladle = document.getElementById('li-ladle');

li_drink.addEventListener('click', onClick);
li_pour.addEventListener('click', onClick);
li_clink.addEventListener('click', onClick);
li_chopstick.addEventListener('click', onClick);
li_spoon.addEventListener('click', onClick);
li_ladle.addEventListener('click', onClick);

function onClick(event) {
	const gesture = this.textContent;
	console.log(gesture);
	popup_content.textContent = `${gesture}\n`;
	tau.openPopup('1btn_popup');
	globalSensorService = new SensorService('', gesture);
	globalSensorService.start();
}

(function () {
	window.addEventListener("tizenhwkey", function (ev) {
		var activePopup = null,
			page = null,
			pageId = "";

		if (ev.keyName === "back") {
			activePopup = document.querySelector(".ui-popup-active");
			page = document.getElementsByClassName("ui-page-active")[0];
			pageId = page ? page.id : "";

			if (pageId === "main" && !activePopup) {
				try {
					tizen.application.getCurrentApplication().exit();
				} catch (ignore) {
				}
			} else {
				window.history.back();
			}
		}
	});
}());