'use strict';

const lfs = require('larvitfs');

let acl;

exports = module.exports = function(customOptions) {
	let returnObj;

	if (customOptions === undefined) {
		customOptions = {};
	}

	if (customOptions.customRoutes === undefined) {
		customOptions.customRoutes = [];
	}

	customOptions.customRoutes.push({
		'regex':          '^/$',
		'controllerName': 'login'
	});

	customOptions.customRoutes.push({
		'regex':          '\\.css$',
		'controllerName': 'css'
	});

	acl = require(__dirname + '/models/acl')(customOptions);

	customOptions.middleware = [
		require('cookies').express(),
		require('larvitsession').middleware(), // Important that this is ran after the cookie middleware
		require(lfs.getPathSync('models/controllerGlobal.js')).middleware()
	];

	customOptions.afterware = [
		require('larvitsession').afterware()
	];

	returnObj = require('larvitbase')(customOptions);

	returnObj.on('httpSession', function(req, res) {
		const originalRunController = res.runController;

		if (customOptions.langs)
			res.langs = customOptions.langs;

		res.runController = function() {
			acl.checkAndRedirect(req, res, function(err, userGotAccess) {
				if (err) {
					throw err;
				}

				// User got access, proceed with executing the controller
				if (userGotAccess) {
					originalRunController();
				} else {
					// If userGotAccess is false, we should not execute the controller.
					// Instead just run sendToClient directly, circumventing the afterware as well.
					res.sendToClient(null, req, res);
				}
			});
		};

		res.next();
	});

	return returnObj;
};
