odoo.define('kzm_pos_product_qty.popups', function (require) {
    "use strict";

    var gui = require('point_of_sale.gui');
    var rpc = require('web.rpc');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
    var PopupWidget = require('point_of_sale.popups');
    var core = require('web.core');
    var chrome = require('point_of_sale.chrome');
    var models = require('point_of_sale.models');
    var framework = require('web.framework');
    var utils = require('web.utils');
    var field_utils = require('web.field_utils');
    var round_pr = utils.round_precision;
    var round_di = utils.round_decimals;

    var _t = core._t;
    var QWeb = core.qweb;

    var ProductQtyPopupWidget = PopupWidget.extend({
        template: 'ProductQtyPopupWidget',
        show: function(options){
            options = options || {};
            this.prod_info_data = options.prod_info_data || '';
            this.total_qty = options.total_qty || '';
            this._super(options);
            this.renderElement();
        },
    });
    gui.define_popup({name:'product_qty_popup', widget: ProductQtyPopupWidget});


    })