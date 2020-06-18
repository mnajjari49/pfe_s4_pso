odoo.define('kzm_pos_bag.popup', function (require) {
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


    var BagSelectionPopupWidget = PopupWidget.extend({
        template: 'BagSelectionPopupWidget',
        init: function(parent, args) {
            var self = this;
            this._super(parent, args);
            this.options = {};
            this.select_item = function(e){
                self.selected_item($(this).parent());
            };
            this.update_bag_qty = function(ev){
                ev.preventDefault();
                var $link = $(ev.currentTarget);
                var $input = $link.parent().parent().find("input");
                var product_elem = $('.product_content[data-product-id="'+$input.attr("prod-id")+'"]')
                if(!product_elem.hasClass('select_item')){
                    self.selected_item(product_elem);
                    product_elem.addClass('select_item');
                }
                var min = parseFloat($input.data("min") || 0);
                var max = parseFloat($input.data("max") || $input.val());
                var total_qty = parseFloat($input.data("total-qty") || 0);
                var quantity = ($link.has(".fa-minus").length ? -1 : 1) + parseFloat($input.val(),10);
                $input.val(quantity > min ? (quantity < max ? quantity : max) : min);
                $input.change();
                self.count_bag_total();
                return false;
            };
            this.keydown_qty = function(e){
                var opp_elem;
                var product_elem = $('.product_content[data-line-id="'+$(e.currentTarget).attr("name")+'"]')
                if(!product_elem.hasClass('select_item')){
                    product_elem.addClass('select_item')
                }
                self.count_bag_total();
            };
        },
        selected_item: function($elem){
            var self = this;
            if($elem.hasClass('select_item')){
                $elem.removeClass('select_item')
            } else {
                $elem.addClass('select_item')
            }
            if($('.select_item').length != 0){
                $('#sub_container').show();
                $('#chk_bag_charges').prop('checked', true);
            } else {
                $('#chk_bag_charges').prop('checked', false);
                $('#sub_container').hide();
            }
            self.count_bag_total();
        },
        show: function(options){
            options = options || {};
            this._super(options);
            $('.js_quantity.form-control').keypress(function (e) {
                if ((e.which < 48 || e.which > 57)) {
                    return false;
                }
            });
            $('#sub_container').hide();
            $('#bag_charges_total').html("Total: "+this.format_currency(0));
        },
        click_confirm: function(){
            var self = this;
            var order = self.pos.get_order();
            $('.select_item').each(function(index,el){
                var product = self.pos.db.get_product_by_id($(this).attr('data-product-id'));
                if(product){
                    var input_qty = $("#"+product.id).val();
                    if(input_qty > 0){
                        var line = new models.Orderline({}, {pos: self.pos, order: order, product: product});
                        line.set_quantity(input_qty);
                        line.set_unit_price(0);
                        if($('#chk_bag_charges').prop('checked')){
                            line.set_unit_price(product.list_price);
                        }
                        line.set_bag_color(true);
                        line.set_is_bag(true);
                        order.add_orderline(line);
                    }
                }
            });
            if($('.select_item').length != 0){
                self.gui.close_popup();
            }
        },
        renderElement: function() {
            var self = this;
            this._super();
            this.$('.bag_product .input-group-addon').delegate('a.js_qty','click', this.update_bag_qty);
            this.$('div.input-group').delegate('.js_quantity','input', this.keydown_qty);
            this.$('.ac_product_list').delegate('.product-img','click', this.select_item);

            $('#chk_bag_charges').change(function(){
                self.count_bag_total();
            });
        },
        count_bag_total: function(){
            var self = this;
            var total = 0;
            if($('#chk_bag_charges').prop('checked')){
                $('table.total .bag_value').text("");
                $('.select_item').each(function(index,el){
                    var prod = self.pos.db.get_product_by_id($(this).attr('data-product-id'));
                    if(prod){
                        self.input_qty = $("#"+prod.id).val();
                        if(self.input_qty && prod.list_price){
                            total += self.input_qty*prod.list_price;
                        }
                    }
                });
            }
            $('#bag_charges_total').html("Total: "+self.format_currency(total));
        },
        get_product_image_url: function(product_id){
            return window.location.origin + '/web/image?model=product.product&field=image_medium&id='+product_id;
        },
    });
    gui.define_popup({name:'bags_popup', widget: BagSelectionPopupWidget});

});