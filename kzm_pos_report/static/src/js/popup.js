odoo.define('kzm_pos_report.popup', function (require) {
    "use strict";
    console.log("============")
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

    var POSSessionConfig = PopupWidget.extend({
        template: 'POSSessionConfig',
        show: function(options){
            options = options || {};
            this._super(options);
            this.renderElement();
        },
        renderElement: function() {
            var self = this;
            this._super();
//            $('.close-pos').click(function(){
//            	self.gui.close_popup();
//    	    	self.gui.close();
//            });
            $('.logout-pos').click(function(){
                framework.redirect('/web/session/logout');
            });
            $('.close-popup-btn').click(function(){
                self.gui.close_popup();
            });
            $('.close-pos-session').click(function(){
                if(self.pos.config.cash_control){
                    self.gui.show_popup('cash_control',{
                        title:'Closing Cash Control',
                        statement_id:self.statement_id,
                    });
                }else{
                    var params = {
                        model: 'pos.session',
                        method: 'custom_close_pos_session',
                        args:[self.pos.pos_session.id]
                    }
                    rpc.query(params, {async: false}).then(function(res){
                        if(res){
                            var cashier = self.pos.get_cashier() || self.pos.user;
                            self.gui.close_popup();
                            if(self.pos.config.z_report){
                                var pos_session_id = [self.pos.pos_session.id];
                                self.pos.chrome.do_action('kzm_pos_report.pos_z_report',{
                                    additional_context:{
                                        active_ids:pos_session_id,
                                    }
                                }).catch(function(e){
                                    console.log("Error: ",e);
                                });
                                if(self.pos.config.iface_print_via_proxy){
                                    var report_name = "kzm_pos_report.pos_z_thermal_report_template";
                                    var params = {
                                        model: 'ir.actions.report',
                                        method: 'get_html_report',
                                        args: [pos_session_id[0], report_name],
                                    }
                                    rpc.query(params, {async: false})
                                    .then(function(report_html){
                                        if(report_html && report_html[0]){
                                            self.pos.proxy.print_receipt(report_html[0]);
                                        }
                                    });
                                }
                                if(cashier && cashier.login_with_pos_screen){
                                    setTimeout(function(){
                                        framework.redirect('/web/session/logout');
                                    }, 5000);
                                } else{
                                    setTimeout(function(){
                                        self.pos.gui.close();
                                    }, 5000);
                                }
                            } else{
                                if(cashier && cashier.login_with_pos_screen){
                                    framework.redirect('/web/session/logout');
                                } else{
                                    self.pos.gui.close();
                                }
                            }
                        }
                    }).catch(function (type, error){
                        if(error.code === 200 ){    // Business Logic Error, not a connection problem
                           self.gui.show_popup('error-traceback',{
                                'title': error.data.message,
                                'body':  error.data.debug
                           });
                        }
                    });
                }
            });
        },
    });
    gui.define_popup({name:'POS_session_config', widget: POSSessionConfig});

    var TodayPosReportPopup = PopupWidget.extend({
        template: 'TodayPosReportPopup',
        show: function(options){
            this.str_main = options.str_main || "";
            this.str_payment = options.str_payment || "";
            options = options || {};
            this._super(options);
            this.session_total = options.result['session_total'] || [];
            this.payment_lst = options.result['payment_lst'] || [];
            this.all_cat = options.result['all_cat'] || [];
            this.renderElement();
            $(".tabs-menu a").click(function(event) {
                event.preventDefault();
                $(this).parent().addClass("current");
                $(this).parent().siblings().removeClass("current");
                var tab = $(this).attr("href");
                $(".tab-content").not(tab).css("display", "none");
                $(tab).fadeIn();
            });
        },
        renderElement: function() {
            var self = this;
            this._super();
        },
    });
    gui.define_popup({name:'pos_today_sale', widget: TodayPosReportPopup});

    var PaymentSummaryReportPopupWizard = PopupWidget.extend({
        template: 'PaymentSummaryReportPopupWizard',
        show: function(options){
            options = options || {};
            this._super(options);
            var self = this;
            var today_date = new Date().toISOString().split('T')[0];
            var date = new Date();
            var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            var first_date_of_month = firstDay.toISOString().split('T')[0];
            if(this.pos.config.current_month_date){
                $('input#payment_report_start_date').val(first_date_of_month);
                $('input#payment_report_end_date').val(today_date);
            }
            $("#payment_report_start_date").change(function() {
                if($("#payment_report_start_date").val()){
                     $('#payment_report_start_date').css('border','');
                }
            });
            $("#payment_report_end_date").change(function() {
                if($("#payment_report_end_date").val()){
                    $('#payment_report_end_date').css('border','');
                }
            });
            $('input#payment_report_start_date').focus();
        },
        click_confirm: function(){
            var self = this;
            var order = this.pos.get_order();
            var from_date = $('input#payment_report_start_date').val();
            var to_date = $('input#payment_report_end_date').val();
            var today_date = new Date().toISOString().split('T')[0];
            var data = dropdown_data.value;
            var pop_start_date = from_date.split('-');
            self.pos.from_date  = pop_start_date[2] + '-' + pop_start_date[1] + '-' + pop_start_date[0];
            var pop_end_date = to_date.split('-');
            self.pos.to_date  = pop_end_date[2] + '-' + pop_end_date[1] + '-' + pop_end_date[0];
            if(from_date == "" && to_date == "" || from_date != "" && to_date == "" || from_date == "" && to_date != "" ){
                if(!from_date){
                    $('#payment_report_start_date').css('border','1px solid red');
                }
                if(!to_date){
                    $('#payment_report_end_date').css('border','1px solid red');
                }
                return;
            } else if(from_date > to_date){
                alert("Start date should not be greater than end date");
            } else{
                var val = {
                    'start_date':from_date,
                    'end_date':to_date,
                    'summary': data
                }
                var params = {
                    model: 'pos.order',
                    method: 'payment_summary_report',
                    args: [val],
                }
                rpc.query(params, {async: false}).then(function(res){
                    if(res){
                        if(Object.keys(res['journal_details']).length == 0 && Object.keys(res['salesmen_details']).length == 0){
                            order.set_sales_summary_mode(false);
                            alert("No records found!");
                        } else{
                            order.set_sales_summary_mode(true);
                            order.set_sales_summary_vals(res);
                            var journal_key = Object.keys(order.get_sales_summary_vals()['journal_details']);
                            if(journal_key.length > 0){
                                var journal_summary_data = order.get_sales_summary_vals()['journal_details'];
                            } else {
                                var journal_summary_data = false;
                            }
                            var sales_key = Object.keys(order.get_sales_summary_vals()['salesmen_details']);
                            if(sales_key.length > 0){
                                var sales_summary_data = order.get_sales_summary_vals()['salesmen_details'];
                            } else {
                                var sales_summary_data = false;
                            }
                            var total = Object.keys(order.get_sales_summary_vals()['summary_data']);
                            if(total.length > 0){
                                var total_summary_data = order.get_sales_summary_vals()['summary_data'];
                            } else {
                                var total_summary_data = false;
                            }
                            if (self.pos.config.iface_print_via_proxy) {
                                var receipt = "";
                                receipt = QWeb.render('PaymentSummaryReportXmlReceipt', {
                                    widget: self,
                                    pos: self.pos,
                                    order: order,
                                    receipt: order.export_for_printing(),
                                    journal_details: journal_summary_data,
                                    salesmen_details: sales_summary_data,
                                    total_summary : total_summary_data
                                });
                               self.pos.proxy.print_receipt(receipt);
                            } else{
                                self.gui.show_screen('receipt');
                           }
                        }
                    }
                });
            }
        },
    });
    gui.define_popup({name:'payment_summary_report_wizard', widget: PaymentSummaryReportPopupWizard});

    var ProductSummaryReportPopupWizard = PopupWidget.extend({
        template: 'ProductSummaryReportPopupWizard',
        show: function(options){
            options = options || {};
            this._super(options);
            var self = this;
            self.pos.signature = false;
            $('input#product_report_start_date').focus();
            var no_of_report = this.pos.config.no_of_copy_receipt;
            $('input#no_of_summary').val(no_of_report);
            var today_date = new Date().toISOString().split('T')[0];
            var date = new Date();
            var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            var first_date_of_month = firstDay.toISOString().split('T')[0];
            if(this.pos.config.product_summary_month_date){
                $('input#product_report_start_date').val(first_date_of_month);
                $('input#product_report_end_date').val(today_date);
            }
            $("#product_report_start_date").change(function() {
                if($("#product_report_start_date").val() != ""){
                     $('#product_report_start_date').css('border','');
                }
            });
            $("#product_report_end_date").change(function() {
                if($("#product_report_end_date").val() != ""){
                    $('#product_report_end_date').css('border','');
                }
            });
            if(no_of_report <= 0){
                $('input#no_of_summary').val(1);
            } else{
                $('input#no_of_summary').val(no_of_report);
            }
            $("#no_of_summary").change(function() {
                if($("#no_of_summary").val() != ""){
                    $('#no_of_summary').css('border','');
                }
            });
            if(this.pos.config.signature){
                self.pos.signature = true;
            }
        },
        click_confirm: function(){
            var self = this;
            var from_date = $('input#product_report_start_date').val();
            var to_date = $('input#product_report_end_date').val();
            var no_of_copies = $('input#no_of_summary').val();
            var order = this.pos.get_order();
            var today_date = new Date().toISOString().split('T')[0];
            var report_value = [];
            self.pos.from_date = from_date;
            self.pos.to_date = to_date;
            if(no_of_copies <= 0){
                 $('#no_of_summary').css('border','1px solid red');
                 return;
            }
            if($('input#product_summary').prop("checked") == true){
                var id = $('input#product_summary').attr("id");
                report_value.push(id)
            }
            if($('input#category_summary').prop("checked") == true){
                var id = $('input#category_summary').attr("id");
                report_value.push(id)
            }
            if($('input#location_summary').prop("checked") == true){
                var id = $('input#location_summary').attr("id");
                report_value.push(id)
            }
            if($('input#payment_summary').prop("checked") == true){
                var id = $('input#payment_summary').attr("id");
                report_value.push(id)
            }
            if(from_date == "" && to_date == "" || from_date != "" && to_date == "" || from_date == "" && to_date != "" ){
                if(from_date == ""){
                    $('#product_report_start_date').css('border','1px solid red');
                }
                if(to_date == ""){
                    $('#product_report_end_date').css('border','1px solid red');
                }
                return;
            } else if(from_date > to_date){
                alert("Start date should not be greater than end date");
            } else{
                var val = {
                    'start_date':from_date,
                    'end_date':to_date,
                    'summary': report_value
                }
                var params = {
                    model: 'pos.order',
                    method: 'product_summary_report',
                    args: [val],
                }
                rpc.query(params, {async: false}).then(function(res){
                    if(res){
                        if(Object.keys(res['category_summary']).length == 0 && Object.keys(res['product_summary']).length == 0 &&
                            Object.keys(res['location_summary']).length == 0 && Object.keys(res['payment_summary']).length == 0){
                            order.set_order_summary_report_mode(false);
                            alert("No records found!");
                        } else{
                            order.set_order_summary_report_mode(true);
                            self.pos.product_total_qty = 0.0;
                            self.pos.category_total_qty = 0.0;
                            self.pos.payment_summary_total = 0.0;
                            if(res['product_summary']){
                                _.each(res['product_summary'], function(value,key){
                                        self.pos.product_total_qty += value;
                                    });
                            }
                            if(res['category_summary']){
                                _.each(res['category_summary'], function(value,key) {
                                        self.pos.category_total_qty += value;
                                    });
                            }
                            if(res['payment_summary']){
                                _.each(res['payment_summary'], function(value,key) {
                                        self.pos.payment_summary_total += value;
                                    });
                            }
                        order.set_product_summary_report(res);
                        var product_summary_key = Object.keys(order.get_product_summary_report()['product_summary']);
                        if(product_summary_key.length == 0){
                            var product_summary_data = false;
                        } else {
                            var product_summary_data = order.get_product_summary_report()['product_summary'];
                        }
                        var category_summary_key = Object.keys(order.get_product_summary_report()['category_summary']);
                        if(category_summary_key.length == 0){
                            var category_summary_data = false;
                        } else {
                            var category_summary_data = order.get_product_summary_report()['category_summary'];
                        }
                        var payment_summary_key = Object.keys(order.get_product_summary_report()['payment_summary']);
                        if(payment_summary_key.length == 0){
                        var payment_summary_data = false;
                        } else {
                            var payment_summary_data = order.get_product_summary_report()['payment_summary'];
                        }
                        var location_summary_key = Object.keys(order.get_product_summary_report()['location_summary']);
                        if(location_summary_key.length == 0){
                            var location_summary_data = false;
                        } else {
                            var location_summary_data = order.get_product_summary_report()['location_summary'];
                        }
                        if (self.pos.config.iface_print_via_proxy) {
                            var receipt = "";
                            for (var step = 0; step < no_of_copies; step++) {
                                receipt = QWeb.render('ProductSummaryReportXmlReceipt', {
                                    widget: self,
                                    pos: self.pos,
                                    order: order,
                                    receipt: order.export_for_printing(),
                                    product_details: product_summary_data,
                                    category_details:category_summary_data,
                                    payment_details: payment_summary_data,
                                    location_details:location_summary_data,
                                });
                                self.pos.proxy.print_receipt(receipt);
                            }
                        } else{
                            self.gui.show_screen('receipt');
                            }
                        }
                    }
                });
            }
        },
    });
    gui.define_popup({name:'product_summary_report_wizard', widget: ProductSummaryReportPopupWizard});

    var OrderSummaryPopupWidget = PopupWidget.extend({
        template: 'OrderSummaryPopupWidget',
        show: function(options){
            options = options || {};
            this._super(options);
            $('input#order_report_start_date').focus();
            var self = this;
            var today_date = new Date().toISOString().split('T')[0];
            self.pos.signature = false;
            if (self.pos.config.order_summary_signature){
                self.pos.signature = true;
            }
            var date = new Date();
            var firstDay = new Date(date.getFullYear(), date.getMonth(), 1);
            var first_date = firstDay.toISOString().split('T')[0];
            var no_of_report = this.pos.config.order_summary_no_of_copies;
            if(no_of_report <= 0){
                $('input#no_of_copies').val(1);
            }else{
                $('input#no_of_copies').val(no_of_report);
            }
            if(this.pos.config.order_summary_current_month){
                $('input#order_report_start_date').val(first_date);
                $('input#order_report_end_date').val(today_date);
            }
        },
        click_confirm: function(){
            var self = this;
            var value = {};
            var order = this.pos.get_order();
            var num = $('input#no_of_copies').val()
            self.pos.from_date = $('input#order_report_start_date').val();
            self.pos.to_date = $('input#order_report_end_date').val();
            var today_date = new Date().toISOString().split('T')[0];
            var state = states.value;
            var custom_receipt = true;
            var report_list = [];
            var client = this.pos.get_client();
            if($('input#order_summary_report').prop("checked") == true){
                var id = $('input#order_summary_report').attr("id");
                report_list.push(id)
            }
            if($('input#category_summary_report').prop("checked") == true){
                var id = $('input#category_summary_report').attr("id");
                report_list.push(id)
            }
            if($('input#payment_summary_report').prop("checked") == true){
                var id = $('input#payment_summary_report').attr("id");
                report_list.push(id)
            }
            if($('input#no_of_copies').val() <= 0){
                $('input#no_of_copies').css('border','1px solid red');
                return;
            }
            if(self.pos.from_date == "" && self.pos.to_date == "" || self.pos.from_date != "" && self.pos.to_date == "" || self.pos.from_date == "" && self.pos.to_date != "" ){
                if(self.pos.from_date == ""){
                    $('#order_report_start_date').css('border','1px solid red');
                }
                if(self.pos.to_date == ""){
                    $('#order_report_end_date').css('border','1px solid red');
                }
                return;
            } else if(self.pos.from_date > self.pos.to_date) {
                alert("End date must be greater");
                return;
            } else{
                value = {
                    'start_date' : self.pos.from_date,
                    'end_date' : self.pos.to_date,
                    'state' : state,
                    'summary' :report_list
                }
                var params = {
                    model : 'pos.order',
                    method : 'order_summary_report',
                    args : [value],
                }
                rpc.query(params,{async:false}).then(function(res){
                    self.pos.state = false;
                    if(res['state']){
                        self.pos.state = true
                    }
                    if(res){
                        if(Object.keys(res['category_report']).length == 0 && Object.keys(res['order_report']).length == 0 &&
                                Object.keys(res['payment_report']).length == 0){
                                order.set_receipt(false);
                                alert("No records found!");
                        } else{
                            order.set_receipt(custom_receipt);
                            self.pos.total_categ_amount = 0.00;
                            self.pos.total_amount = 0.00;
                            if(res['category_report']){
                                if(self.pos.state){
                                    _.each(res['category_report'], function(value,key) {
                                        self.pos.total_categ_amount += value[1];
                                    });
                                }
                            }
                            if(res['payment_report']){
                                if(self.pos.state){
                                    _.each(res['payment_report'], function(value,key) {
                                        self.pos.total_amount += value;
                                    });
                                }
                            }
                            order.set_order_list(res);
                            if(order.get_receipt()) {
                                var category_data = '';
                                var order_data = '';
                                var payment_data = '';
                                if(Object.keys(order.get_order_list().order_report).length == 0 ){
                                    order_data = false;
                                }else{
                                    order_data = order.get_order_list()['order_report']
                                }
                                if(Object.keys(order.get_order_list().category_report).length == 0 ){
                                    category_data = false;
                                }else{
                                    category_data = order.get_order_list()['category_report']
                                }
                                if(Object.keys(order.get_order_list().payment_report).length == 0 ){
                                    payment_data = false;
                                }else{
                                    payment_data = order.get_order_list()['payment_report']
                                }
                                var receipt = '';
                                if(self.pos.config.iface_print_via_proxy){
                                    for (var i=0;i < num;i++) {
                                        receipt = QWeb.render('OrderXmlReceipt', {
                                            widget: self,
                                            pos: self.pos,
                                            order: order,
                                            receipt: order.export_for_printing(),
                                            order_report : order_data,
                                            category_report : category_data,
                                            payment_report : payment_data,
                                        });
                                    }
                                    self.pos.proxy.print_receipt(receipt);
                                } else{
                                    self.gui.show_screen('receipt')
                                }
                            }
                        }
                    }
                });
            }
        },
    });
    gui.define_popup({name:'order_summary_popup',widget: OrderSummaryPopupWidget});

    var ReportPopupWidget = PopupWidget.extend({
        template: 'ReportPopupWidget',
        events: _.extend({}, PopupWidget.prototype.events, {
            'click .report_pdf.session': 'session_report_pdf',
            'click .report_thermal.session': 'session_report_thermal',
            'click .report_pdf.location': 'location_report_pdf',
            'click .report_thermal.location': 'location_report_thermal',
            'click .tablinks':'tablinks',
        }),
        show: function(options){
            options = options || {};
            this._super(options);
            this.enable_thermal_print = this.pos.config.iface_print_via_proxy || false;
            this.renderElement();
        },
        tablinks: function(event){
            var cityName = $(event.currentTarget).attr('value');
            var i, tabcontent, tablinks;
            tabcontent = document.getElementsByClassName("tabcontent");
            for (i = 0; i < tabcontent.length; i++) {
                tabcontent[i].style.display = "none";
            }
            tablinks = document.getElementsByClassName("tablinks");
            for (i = 0; i < tablinks.length; i++) {
                tablinks[i].className = tablinks[i].className.replace(" active", "");
            }
            document.getElementById(cityName).style.display = "block";
            event.currentTarget.className += " active";
        },
        session_report_pdf: function(e){
            var self = this;
            var session_id = $(e.currentTarget).data('id');
            self.pos.chrome.do_action('kzm_pos_report.report_pos_inventory_session_pdf_front',{additional_context:{
                active_ids:[session_id],
            }}).catch(function(){
                alert("Connection lost");
            });
        },
        session_report_thermal: function(e){
            var self = this;
            var session_id = $(e.currentTarget).data('id');
            var report_name = "kzm_pos_report.front_inventory_session_thermal_report_template";
            var params = {
                model: 'ir.actions.report',
                method: 'get_html_report',
                args: [session_id, report_name],
            }
            rpc.query(params, {async: false})
            .then(function(report_html){
                if(report_html && report_html[0]){
                    self.pos.proxy.print_receipt(report_html[0]);
                }
            });
        },
        location_report_pdf: function(e){
            var self = this;
            var location_id = $(e.currentTarget).data('id');
            self.pos.chrome.do_action('kzm_pos_report.report_pos_inventory_location_pdf_front',{additional_context:{
                active_ids:[location_id],
            }}).catch(function(){
                alert("Connection lost");
            });
        },
        location_report_thermal: function(e){
            var self = this;
            var location_id = $(e.currentTarget).data('id');
            var report_name = "kzm_pos_report.front_inventory_location_thermal_report_template";
            var params = {
                model: 'ir.actions.report',
                method: 'get_html_report',
                args: [location_id, report_name],
            }
            rpc.query(params, {async: false})
            .then(function(report_html){
                if(report_html && report_html[0]){
                    self.pos.proxy.print_receipt(report_html[0]);
                }
            });
        },
    });
    gui.define_popup({name:'report_popup', widget: ReportPopupWidget});

    var CashControlWizardPopup = PopupWidget.extend({
        template : 'CashControlWizardPopup',
        show : function(options) {
            var self = this;
            options = options || {};
            this.title = options.title || ' ';
            this.statement_id = options.statement_id || false;
            var selectedOrder = self.pos.get_order();
            this._super();
            this.renderElement();
            var self = this;
            $('#value, #no_of_values').keypress(function(evt){
                var $txtBox = $(this);
                var charCode = (evt.which) ? evt.which : evt.keyCode
                if (charCode > 31 && (charCode < 48 || charCode > 57) && charCode != 46)
                    return false;
                else {
                    var len = $txtBox.val().length;
                    var index = $txtBox.val().indexOf('.');
                    if (index > 0 && charCode == 46) {
                      return false;
                    }
                    if (index > 0) {
                        var charAfterdot = (len + 1) - index;
                        if (charAfterdot > 3) {
                            return false;
                        }
                    }
                }
                return $txtBox;
                /*if (e.which != 8 && e.which != 46 && e.which != 0 && (e.which < 48 || e.which > 57)) {
                    return false;
                }*/
            });
            var session_data = {
                model: 'pos.session',
                method: 'search_read',
                domain: [['id', '=', self.pos.pos_session.id]],
            }
            rpc.query(session_data, {async: false}).then(function(data){
                if(data){
                     _.each(data, function(value){
                        $("#open_bal").text(self.format_currency(value.cash_register_balance_start));
                        $("#transaction").text(self.format_currency(value.cash_register_total_entry_encoding));
                        $("#theo_close_bal").text(self.format_currency(value.cash_register_balance_end));
                        $("#real_close_bal").text(self.format_currency(value.cash_register_balance_end_real));
                        $("#differ").text(self.format_currency(value.cash_register_difference));
                        $('.button.close_session').show();
                     });
                }
            });
            $("#cash_details").show();
            this.$('.button.close_session').hide();
            this.$('.button.ok').click(function() {
                var dict = [];
                var items=[]
                var cash_details = []
                $(".cashcontrol_td").each(function(){
                    items.push($(this).val());
                });
                while (items.length > 0) {
                  cash_details.push(items.splice(0,3))
                }
                 _.each(cash_details, function(cashDetails){
                    if(cashDetails[2] > 0.00){
                        dict.push({
                           'coin_value':Number(cashDetails[0]),
                           'number_of_coins':Number(cashDetails[1]),
                           'subtotal':Number(cashDetails[2]),
                           'pos_session_id':self.pos.pos_session.id
                        });
                    }
                });
                if(dict.length > 0){
                    var params = {
                        model: 'pos.session',
                        method: 'cash_control_line',
                        args:[self.pos.pos_session.id,dict]
                    }
                    rpc.query(params, {async: false}).then(function(res){
                            if(res){
                            }
                    }).catch(function (type, error){
                        if(error.code === 200 ){    // Business Logic Error, not a connection problem
                           self.gui.show_popup('error-traceback',{
                                'title': error.data.message,
                                'body':  error.data.debug
                           });
                        }
                    });
                }
                var session_data = {
                    model: 'pos.session',
                    method: 'search_read',
                    domain: [['id', '=', self.pos.pos_session.id]],
                }
                rpc.query(session_data, {async: false}).then(function(data){
                    if(data){
                         _.each(data, function(value){
                            $("#open_bal").text(self.format_currency(value.cash_register_balance_start));
                            $("#transaction").text(self.format_currency(value.cash_register_total_entry_encoding));
                            $("#theo_close_bal").text(self.format_currency(value.cash_register_balance_end));
                            $("#real_close_bal").text(self.format_currency(value.cash_register_balance_end_real));
                            $("#differ").text(self.format_currency(value.cash_register_difference));
                            $('.button.close_session').show();
                         });
                    }
                });
            });
            this.$('.button.close_session').click(function() {
                var params = {
                    model: 'pos.session',
                    method: 'custom_close_pos_session',
                    args:[self.pos.pos_session.id]
                }
                rpc.query(params, {async: false}).then(function(res){
                    if(res){
                        var cashier = self.pos.get_cashier();
                        self.gui.close_popup();
                        if(self.pos.config.z_report){
                            var pos_session_id = [self.pos.pos_session.id];
                            self.pos.chrome.do_action('kzm_pos_report.pos_z_report',{
                                additional_context:{
                                    active_ids:pos_session_id,
                                }
                            }).catch(function(e){
                                console.log("Error: ",e);
                            });
                            if(self.pos.config.iface_print_via_proxy){
                                var report_name = "kzm_pos_report.pos_z_thermal_report_template";
                                var params = {
                                    model: 'ir.actions.report',
                                    method: 'get_html_report',
                                    args: [pos_session_id[0], report_name],
                                }
                                rpc.query(params, {async: false})
                                .then(function(report_html){
                                    if(report_html && report_html[0]){
                                        self.pos.proxy.print_receipt(report_html[0]);
                                    }
                                });
                            }
                            if(cashier && cashier.login_with_pos_screen){
                                setTimeout(function(){
                                    framework.redirect('/web/session/logout');
                                }, 5000);
                            }else{
                                setTimeout(function(){
                                    self.pos.gui.close();
                                }, 5000);
                            }
                        } else{
                            if(cashier && cashier.login_with_pos_screen){
                                framework.redirect('/web/session/logout');
                            }else{
                                self.pos.gui.close();
                            }
                        }
                    }
                }).catch(function (type, error){
                    if(error.code === 200 ){    // Business Logic Error, not a connection problem
                       self.gui.show_popup('error-traceback',{
                            'title': error.data.message,
                            'body':  error.data.debug
                       });
                    }
                });
            });
            this.$('.button.cancel').click(function() {
                self.gui.close_popup();
            });
        },
        renderElement: function() {
            var self = this;
            this._super();
            var selectedOrder = self.pos.get_order();
            var table_row = "<tr id='cashcontrol_row'>" +
                            "<td><input type='text'  class='cashcontrol_td coin' id='value' value='0.00' /></td>" + "<span id='errmsg'/>"+
                            "<td><input type='text' class='cashcontrol_td no_of_coin' id='no_of_values' value='0.00' /></td>" +
                            "<td><input type='text' class='cashcontrol_td subtotal' id='subtotal' disabled='true' value='0.00' /></td>" +
                            "<td id='delete_row'><span class='fa fa-trash-o'></span></td>" +
                            "</tr>";
            $('#cashbox_data_table tbody').append(table_row);
            $('#add_new_item').click(function(){
                $('#cashbox_data_table tbody').append(table_row);
            });
            $('#cashbox_data_table tbody').on('click', 'tr#cashcontrol_row td#delete_row',function(){
                $(this).parent().remove();
                self.compute_subtotal();
            });
            $('#cashbox_data_table tbody').on('change focusout', 'tr#cashcontrol_row td',function(){
                var no_of_value, value;
                if($(this).children().attr('id') === "value"){
                    value = Number($(this).find('#value').val());
                    no_of_value = Number($(this).parent().find('td #no_of_values').val());
                }else if($(this).children().attr('id') === "no_of_values"){
                    no_of_value = Number($(this).find('#no_of_values').val());
                    value = Number($(this).parent().find('td #value').val());
                }
                $(this).parent().find('td #subtotal').val(value * no_of_value);
                self.compute_subtotal();
            });
            this.compute_subtotal = function(event){
                var subtotal = 0;
                _.each($('#cashcontrol_row td #subtotal'), function(input){
                    if(Number(input.value) && Number(input.value) > 0){
                        subtotal += Number(input.value);
                    }
                });
                $('.subtotal_end').text(self.format_currency(subtotal));
            }
        }
    });
    gui.define_popup({name:'cash_control', widget: CashControlWizardPopup});

});