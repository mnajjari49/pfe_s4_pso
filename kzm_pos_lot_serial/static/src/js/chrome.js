odoo.define('kzm_pos_lot_serial.chrome', function (require) {
"use strict";


    var chrome = require('point_of_sale.chrome');
    var gui = require('point_of_sale.gui');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var core = require('web.core');
    var rpc = require('web.rpc');
    var ActionManager = require('web.ActionManager');
    var models = require('point_of_sale.models');
    var session = require('web.session');
    var bus_service = require('bus.BusService');
    var bus = require('bus.Longpolling');
    var cross_tab = require('bus.CrossTab').prototype;

    var _t = core._t;
    var QWeb = core.qweb;




});