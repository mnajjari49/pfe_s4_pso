odoo.define('kzm_pos_product_return.popup', function (require) {
    "use strict";


    var gui = require('point_of_sale.gui');
    var rpc = require('web.rpc');
    var PosBaseWidget = require('point_of_sale.BaseWidget');
//    var PopupWidget = require('point_of_sale.popups');
    var popups = require('point_of_sale.popups');
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


    var PosReturnOrderPopupWidget = popups.extend({
		template: 'PosReturnOrderPopupWidget',
		init: function(parent, args) {
			this._super(parent, args);
			this.options = {};
		},
		//
		show: function(options) {
			options = options || {};
			var self = this;
			this._super(options);
			this.orderlines = options.orderlines || [];

		},
		//
		renderElement: function() {
			var self = this;
			this._super();
			var selectedOrder = this.pos.get_order();
			var orderlines = self.options.orderlines;
			var order = self.options.order;

			// When you click on apply button, Customer is selected automatically in that order
			var partner_id = false
			var client = false
			if (order && order.partner_id != null)
				partner_id = order.partner_id[0];
				client = this.pos.db.get_partner_by_id(partner_id);

			var return_products = {};
			var exact_return_qty = {};
					var exact_entered_qty = {};



			this.$('#apply_return_order').click(function() {
				var entered_code = $("#entered_item_qty").val();
				var list_of_qty = $('.entered_item_qty');


				$.each(list_of_qty, function(index, value) {
					var entered_item_qty = $(value).find('input');
					var qty_id = parseFloat(entered_item_qty.attr('qty-id'));
					var line_id = parseFloat(entered_item_qty.attr('line-id'));
					var entered_qty = parseFloat(entered_item_qty.val());

					exact_return_qty = qty_id;
					exact_entered_qty = entered_qty || 0;

					if(!exact_entered_qty){
						return;
					}
					else if (exact_return_qty >= exact_entered_qty){
					  return_products[line_id] = entered_qty;
					}
					else{
					alert("Cannot Return More quantity than purchased")
					}

				});
				//return return_products;


				Object.keys(return_products).forEach(function(line_id) {

					var orders_lines = self.pos.db.all_orders_line_list;
					var orderline = [];
					   for(var n=0; n < orders_lines.length; n++){
						   if (orders_lines[n]['id'] == line_id){
							var product = self.pos.db.get_product_by_id(orders_lines[n].product_id[0]);
							selectedOrder.add_product(product, {
								quantity: - parseFloat(return_products[line_id]),
								price: orders_lines[n].price_unit,
								discount: orders_lines[n].discount
							});
							selectedOrder.selected_orderline.original_line_id = orders_lines[n].id;
						   }
					   }

				});
				selectedOrder.set_client(client);
				self.pos.set_order(selectedOrder);
				self.gui.show_screen('products');

			   });

		},

	});

	gui.define_popup({
		name: 'pos_return_order_popup_widget',
		widget: PosReturnOrderPopupWidget
	});

	var PosReturnOrderOption = popups.extend({
        template: 'PosReturnOrderOption',
        show: function(options){
            var self = this;
            options = options || {};
            this._super(options);
            this.renderElement();
            $('.close_btn').click(function(){
                var selectedOrder = self.pos.get_order();
                if(selectedOrder){
                    $("div#sale_mode").click();
                }
                self.gui.close_popup();
            });
            $('#choice_without_receipt').click(function(event){
                var selectedOrder = self.pos.get_order();
                if(selectedOrder){
                    selectedOrder.change_mode('missing');
                    self.gui.close_popup();
                }
            });
            $('#choice_with_receipt').click(function(){
                self.gui.close_popup();
                self.gui.show_popup('pos_return_order');
            });
        },
    });
    gui.define_popup({name:'PosReturnOrderOption', widget: PosReturnOrderOption});

    var PosReturnOrder = popups.extend({
        template: 'PosReturnOrder',
        init: function(parent, args) {
            var self = this;
            this._super(parent, args);
            this.options = {};
            this.line = [];
            this.select_item = function(e){
                self.selected_item($(this).parent());
            };
            this.update_return_product_qty = function(ev){
                ev.preventDefault();
                var $link = $(ev.currentTarget);
                var $input = $link.parent().parent().find("input");
                var product_elem = $('.product_content[data-line-id="'+$input.attr("name")+'"]')
                if(!product_elem.hasClass('select_item')){
                    product_elem.addClass('select_item')
                }
                var min = parseFloat($input.data("min") || 0);
                var max = parseFloat($input.data("max") || $input.val());
                var total_qty = parseFloat($input.data("total-qty") || 0);
                var quantity = ($link.has(".fa-minus").length ? -1 : 1) + parseFloat($input.val(),10);
                $input.val(quantity > min ? (quantity < max ? quantity : max) : min);
                $input.change();
                return false;
            };
            this.keypress_order_number = function(e){
                if(e.which === 13){
                    var selectedOrder = self.pos.get_order();
                    var domain;
                    var ret_o_ref = $("input#return_order_number").val();
                    if (ret_o_ref.indexOf('Order') == -1) {
                        var ret_o_ref_order = _t('Order ') + ret_o_ref.toString();
                    }
                    if(self.pos.config.multi_shop_id && self.pos.config.multi_shop_id[0]){
                        domain = ['|',['shop_id','=',self.pos.config.multi_shop_id[0]],['shop_id','=',false],['pos_reference','=', ret_o_ref_order]];
                    } else{
                        domain = [['pos_reference', '=', ret_o_ref_order]];
                    }
                    if (ret_o_ref.length > 0) {
                        var params = {
                            model: 'pos.order',
                            method: 'search_read',
                            domain: domain,
                            fields: [],
                        }
                        return rpc.query(params, {async: false}).then(function(result){
                            if (result && result.length > 0) {
                                if(result[0].state == 'draft' || result[0].state == 'cancel'){
                                    return self.pos.db.notification('danger',_t('Sorry, You can not return unpaid/cancel order'));
                                }
                                selectedOrder.set_ret_o_id(result[0].id);
                                selectedOrder.set_ret_o_ref(result[0].pos_reference);
                                if(result[0].partner_id && result[0].partner_id[0]){
                                    var partner = self.pos.db.get_partner_by_id(result[0].partner_id[0])
                                    selectedOrder.set_client(partner);
                                } else{
                                    selectedOrder.set_client(false);
                                }
                                var orderline_params = {
                                    model: 'pos.order.line',
                                    method: 'load_return_order_lines',
                                    args: [result[0].id],
//                	            	domain: [['order_id', '=', result[0].id],['return_qty', '>', 0]],
                                }
                                return rpc.query(orderline_params, {async: false}).then(function(res){
                                    if(res && res.length > 0){
                                        var lines = [];
                                        _.each(res,function(r) {
                                            var prod = self.pos.db.get_product_by_id(r.product_id[0]);
//	                                    	if(prod && selectedOrder.is_sale_product(prod)){
                                            if(prod && !prod.is_dummy_product){
                                                lines.push(r);
                                                self.line[r.id] = r;
                                            }
                                        });
                                        self.lines = lines;
                                        self.renderElement();
                                    } else {
                                        self.pos.db.notification('danger',_t('No item found'));
                                        $('.ac_product_list').empty();
                                    }
                                }).catch(function(){
                                    self.pos.db.notification('danger',"Connection lost");
                                });
                            } else {
                                self.pos.db.notification('danger',_t('No result found'));
                                $('.ac_product_list').empty();
                            }
                        }).catch(function(){
                            self.pos.db.notification('danger',"Connection lost");
                        });
                    }
                }
            };
            this.keydown_qty = function(e){
                if($(this).val() > $(this).data('max')){
                    $(this).val($(this).data('max'))
                }
                if($(this).val() < $(this).data('min')){
                    $(this).val($(this).data('min'))
                }
            };
        },
        selected_item: function($elem){
            var self = this;
            if($elem.hasClass('select_item')){
                $elem.removeClass('select_item')
            } else {
                $elem.addClass('select_item')
            }
        },
        show: function(options){
            var self = this;
            options = options || {};
            this._super(options);
            $("input#return_order_number").focus();
            $('.ac_product_list').empty();
        },
        click_confirm: function(){
            var self = this;
            var selectedOrder = this.pos.get_order();
            if(selectedOrder.get_ret_o_id()){
                var not_allow = true;
                if($('.select_item').length > 0){
                    selectedOrder.empty_cart();
                    _.each($('.select_item'), function(item){
                        var orderline = self.line[$(item).data('line-id')];
                        var input_val = $(item).find('input.return_product_qty[name='+orderline.id+']').val()
                        if(input_val > 0 && input_val <= orderline.return_qty){
                            not_allow = false;
                            var product = self.pos.db.get_product_by_id(orderline.product_id[0]);
                            var line = new models.Orderline({}, {pos: self.pos, order: selectedOrder, product: product});
                            line.set_quantity($('input[name="'+orderline.id+'"').val() * -1);
                            line.set_unit_price(orderline.price_unit);
                            line.set_oid(orderline.order_id);
                            if(orderline.discount){
                                line.set_discount(orderline.discount)
                            }
                            line.set_back_order(selectedOrder.get_ret_o_ref());
                            selectedOrder.add_orderline(line);
                        }
                    });
                    if(not_allow){
                        return
                    }
                    $('#return_order_ref').html(selectedOrder.get_ret_o_ref());
                    this.gui.close_popup();
                }
            }else{
                $("input#return_order_number").focus();
            }
        },
        click_cancel: function(){
            $("div#sale_mode").trigger('click');
            var selectedOrder = this.pos.get_order();
            selectedOrder.set_ret_o_id(null);
            selectedOrder.set_ret_o_ref(null);
            this.gui.close_popup();
        },
        get_product_image_url: function(product_id){
            return window.location.origin + '/web/binary/image?model=product.product&field=image_medium&id='+product_id;
        },
        renderElement: function(){
            this._super();
            this.$('.return_product .input-group-addon').delegate('a.js_return_qty','click', this.update_return_product_qty);
            this.$('div.content').delegate('#return_order_number','keypress', this.keypress_order_number);
            this.$('div.input-group').delegate('.js_quantity','input', this.keydown_qty);
            this.$('.ac_product_list').delegate('.product-img','click', this.select_item);
        }
    });
    gui.define_popup({name:'pos_return_order', widget: PosReturnOrder});

    var SeeOrderDetailsPopupWidget = popups.extend({
		template: 'SeeOrderDetailsPopupWidget',

		init: function(parent, args) {
			this._super(parent, args);
			this.options = {};
		},


		show: function(options) {
			var self = this;
			options = options || {};
			this._super(options);


			this.order = options.order || [];
			this.orderline = options.orderline || [];


		},

		events: {
			'click .button.cancel': 'click_cancel',
		},

		renderElement: function() {
			var self = this;
			this._super();


		},

	});


	gui.define_popup({
		name: 'see_order_details_popup_widget',
		widget: SeeOrderDetailsPopupWidget
	});


    })