/*
 * Copyright (c) The DrunKare Team. All rights reserved.
 */
const accelerationSensor = tizen.sensorservice.getDefaultSensor("ACCELERATION");
const gyroscopeSensor = tizen.sensorservice.getDefaultSensor("GYROSCOPE");

var globalSensorService;
const nullSensorData = { x: 0.0, y: 0.0, z: 0.0 };
var accelStarttime;
var accelEndtime;
var gyroStarttime;
var gyroEndtime;

/* To be added */
const labelTable = {
	drink: 0,
	pour: 1,
	clink: 2,
	chopstick: 3,
	spoon: 4,
	ladle: 5,
}

/*
 * Collection of sensor data
 *
 * description
 * -----------
 * 1. Date (20 bytes)
 *   month (i32) | date (i32) | hours (i32) | minutes (i32) | seconds (i32)
 *
 * 2. Label (4 bytes)
 *   0 - drink
 *   1 - pour
 *   2 - clink
 *   3 - chopstick
 *   4 - spoon
 *   5 - ladle
 *   (To be added)
 *
 * 3. Sensor data (25Hz, 150 samples, 6 * 600 bytes)
 *   accel_x (f32) | accel_y (f32) | accel_z (f32) |
 *   gyro_x (f32) | gyro_y (f32) | gyro_z (f32)
 * -----------
 * (Total) 20 + 4 + 3600 = 3624 bytes
 */
const collSize = 3624;

class SensorCollection {
	constructor(label) {
		// TODO: ES6 getter/setter
		this.raw = new ArrayBuffer(collSize);
		this.now = new Date(Date.now());

		this.month = new Int32Array(this.raw, 0, 1);
		this.date = new Int32Array(this.raw, 4, 1);
		this.hours= new Int32Array(this.raw, 8, 1);
		this.minutes = new Int32Array(this.raw, 12, 1);
		this.seconds = new Int32Array(this.raw, 16, 1);

		this.month[0] = this.now.getUTCMonth() + 1; // because it starts with 0
		this.date[0] = this.now.getUTCDate();
		this.hours[0] = this.now.getUTCHours();
		this.minutes[0] = this.now.getUTCMinutes();
		this.seconds[0] = this.now.getUTCSeconds();

		this.label = new Int32Array(this.raw, 20, 1);
		this.label[0] = label;

		this.accel_x = new Float32Array(this.raw, 24, 150);
		this.accel_y = new Float32Array(this.raw, 624, 150);
		this.accel_z = new Float32Array(this.raw, 1224, 150);
		this.gyro_x = new Float32Array(this.raw, 1824, 150);
		this.gyro_y = new Float32Array(this.raw, 2424, 150);
		this.gyro_z = new Float32Array(this.raw, 3024, 150);
	}
}

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
			sensor_popup_content.textContent += this.accel_x[i];
			sensor_popup_content.textContent += 'ax\n';
			sensor_popup_content.textContent += this.accel_y[i];
			sensor_popup_content.textContent += 'ay\n';
			sensor_popup_content.textContent += this.accel_z[i];
			sensor_popup_content.textContent += 'az\n';
			sensor_popup_content.textContent += this.gyro_x[i];
			sensor_popup_content.textContent += 'gx\n';
			sensor_popup_content.textContent += this.gyro_y[i];
			sensor_popup_content.textContent += 'gy\n';
			sensor_popup_content.textContent += this.gyro_z[i];
			sensor_popup_content.textContent += 'gz\n';
		}

		sensor_popup_content.textContent += `Accel elapsed time ${accelEndtime - accelStarttime} ms\n`;
		sensor_popup_content.textContent += `Gyro elapsed time ${gyroEndtime - gyroStarttime} ms\n`;
	}
}

const sensor_popup_content = document.querySelector('.sensor-ui-popup-content');
const hb_popup_content = document.querySelector('.hb-ui-popup-content');

// Gestures
const li_drink = document.getElementById('li-drink');
const li_pour= document.getElementById('li-pour');
const li_clink = document.getElementById('li-clink');
const li_chopstick = document.getElementById('li-chopstick');
const li_spoon =  document.getElementById('li-spoon');
const li_ladle = document.getElementById('li-ladle');

// Heartbeat
const li_hb = document.getElementById('li-hb');

li_drink.addEventListener('click', gestureOnClick);
li_pour.addEventListener('click', gestureOnClick);
li_clink.addEventListener('click', gestureOnClick);
li_chopstick.addEventListener('click', gestureOnClick);
li_spoon.addEventListener('click', gestureOnClick);
li_ladle.addEventListener('click', gestureOnClick);
li_hb.addEventListener('click', heartbeat);

function gestureOnClick(event) {
	const gesture = this.textContent;
	console.log(gesture);
	sensor_popup_content.textContent = `${gesture}\n`;
	tau.openPopup('#sensor_popup');
	globalSensorService = new SensorService('', gesture);
	globalSensorService.start();
}

function heartbeat(event) {
	tau.openPopup('#hb_popup');
	hb_popup_content.textContent = 'Connect to the WebSocket server\n';

	// Don't enter a real hostname when you push to public repository
	var ws = new WebSocket('Replace with real hostname');

	// In this API version, we must specify binaryType
	ws.binaryType = 'arraybuffer';

	ws.onopen = (function open() {
		const buffer = new ArrayBuffer(4);
		const send = new Uint32Array(buffer, 0);
		send[0] = 42 // magic number
		ws.send(buffer);
		hb_popup_content.textContent += 'Send magic number\n';
	});

	ws.onmessage = (function incoming(ev) {
		const recv = new Uint8Array(ev.data);
		const magicNumber = new Int32Array(recv.buffer)[0];
		if (magicNumber === 42) {
			hb_popup_content.textContent += 'OK\n';
		} else {
			hb_popup_content.textContent += `Expected ${42}, got ${magicNumber}\n`;
		}

		if (ws.readyState === WebSocket.OPEN) {
			ws.close();
		}
	})
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
