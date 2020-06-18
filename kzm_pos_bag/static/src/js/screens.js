odoo.define('kzm_pos_bag.screens', function (require) {
    "use strict";
    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');

    var QWeb = core.qweb;
    var _t = core._t;

    screens.ProductListWidget.include({
        init: function(parent, options) {
            var self = this;
            this._super(parent,options);
            this.model = options.model;
            this.product_list = options.product_list;
        },


    });
    screens.ProductScreenWidget.include({
        start: function(){
            var self = this;
            self._super();
//            this.product_list = options.product_list;
            $('div#bag_charges').click(function(){
                var order = self.pos.get_order();
                if(order.is_empty()){
                    $('div.order-empty').animate({
                        color: '#FFCCCC',
                    }, 1000, 'linear', function() {
                          $(this).css('color','#DDD');
                    });
                    return
                }
               /* if(order.get_ret_o_id()){
                    self.pos.db.notification('danger',_t('Sorry, This operation not allow to add bag!'));
                    return
                }*/
//                console.log($('.product-list'))
//                console.log('=========1', self.pos.product_list)
//                console.log('=========2', self.pos.db.get_product_by_category(0))
//                self.pos.product_list = self.pos.db.get_product_by_category(0)
//                console.log('=========', self.pos.product_list)
                self.gui.show_popup('bags_popup');
            });


        },
        show: function(){
            this._super();
            var self = this;
            var order = this.pos.get_order();
            var partner = self.pos.config.default_partner_id;
            var products = self.pos.chrome.screens.products;
          //  var product_list = options.product_list;
        //    console.log('=========>', products)
//
          }

    });

});