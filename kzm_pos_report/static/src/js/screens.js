odoo.define('kzm_pos_report.screens', function (require) {
    "use strict";

    var screens = require('point_of_sale.screens');
    var gui = require('point_of_sale.gui');
    var models = require('point_of_sale.models');
    var rpc = require('web.rpc');
    var core = require('web.core');
    var PosBaseWidget = require('point_of_sale.BaseWidget');

    var QWeb = core.qweb;
    var _t = core._t;

    console.log("=====================")

    var ProductDetailListScreen = screens.ScreenWidget.extend({
        template: 'ProductDetailListScreen',
        init: function(parent, options){
            var self = this;
            self._super(parent, options);
        },
        show: function(){
            var self = this;
            self.screen_title = self.pos.get_title_detail_expire_screen();
            if(self.screen_title){
                $('#screen_title').html(self.screen_title)
            } else{
                $('#screen_title').html("")
            }
            self._super();
            self.product_detail_record = self.pos.product_detail_record;
            if(self.product_detail_record){
                self.pos.db.add_detail_product_list(self.product_detail_record);
                self.render_product_detail(self.product_detail_record);
            }
            var search_timeout = null;
            this.$('#search_product_detail_exp').on('keypress',function(event){
                clearTimeout(search_timeout);
                var query = this.value;
                search_timeout = setTimeout(function(){
                    self.perform_search(query,event.which === 13);
                },70);
            });
            this.$('.back').click(function(){
                self.gui.show_screen('product_expiry_deshboard');
            });
        },
        render_product_detail: function(product_list){
            var self = this;
            var contents = this.$el[0].querySelector('.product-detail-list-contents');
            contents.innerHTML = "";
            _.each(product_list, function(product){
                var reportsline_html = QWeb.render('ProductDetailLine',{widget: self, product:product});
                var report_tbody = document.createElement('tbody');
                report_tbody.innerHTML = reportsline_html;
                report_tbody = report_tbody.childNodes[1];
                contents.appendChild(report_tbody);
            });
        },
        perform_search: function(query, associate_result){
            var self = this;
            if(query){
                var product_details = self.pos.db.search_detail_product_list(query);
                this.render_product_detail(product_details);
            }else{
                this.render_product_detail(self.product_detail_record);
            }
        },
    });
    gui.define_screen({name:'product_detail_list', widget: ProductDetailListScreen});

    var GraphScreenWidget = screens.ScreenWidget.extend({
        template: 'GraphScreenWidget',
        init: function(parent, options){
            this._super(parent, options);
            this.bar_chart = function(){
                var self = this;
                var order = self.pos.get_order();
                var data = order.get_result();
                var dps = [];
                if(data){
                    for(var i=0;i<data.length;i++){
                        dps.push({label: data[i][0], y: data[i][1]});
                    }
                }
                var symbol = false;
                if($('#top_products').hasClass('menu_selected')){
                    symbol = 'Qty-#######.00';
                }else{
                    symbol = self.pos.currency.symbol ? self.pos.currency.symbol+"#######.00" : false;
                }
                var chart = new CanvasJS.Chart("chartContainer",{
                    width: data && data.length > 10 ? 1200 : 0,
                    dataPointMaxWidth:25,
                    zoomEnabled:true,
                    exportFileName: $('a.menu_selected').text(),
                    exportEnabled: true,
                    theme: "theme3",
                    title: {
                        text: $('a.menu_selected').text()
                    },
                    axisY: {
                        suffix: ""
                    },
                    legend :{
                        verticalAlign: 'bottom',
                        horizontalAlign: "center"
                    },
                    data: [{
                        type: "column",
                        bevelEnabled: true,
                        indexLabel:'{y}',
                        indexLabelOrientation: "vertical", //horizontal
                        yValueFormatString:symbol || '',
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
            this.pie_chart = function(){
                var order = this.pos.get_order();
                var data = order.get_result();
                var dps = [];
                for(var i=0;i<data.length;i++){
                    dps.push({y: data[i][1], indexLabel: data[i][0]});
                }
                var chart = new CanvasJS.Chart("chartContainer",
                {
                    exportFileName: $('a.menu_selected').text(),
                    exportEnabled: true,
                    zoomEnabled:true,
                    theme: "theme2",
                    title:{
                        text: $('a.menu_selected').text()
                    },
                    data: [{
                        type: "pie",
                        showInLegend: true,
                        toolTipContent: "{y} - #percent %",
                        yValueFormatString: "",
                        legendText: "{indexLabel}",
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
        },
        filter:"all",
        date: "all",
        show: function(){
            var self = this;
            this._super();
            $('#duration_selection').prop('selectedIndex',1);
            $("#start_date").val('');
            $("#end_date").val('');
            var from = false;
            var to = false;
//        	if($('#duration_selection').val() != "nofilter"){
                from = moment(new Date()).locale('en').format('YYYY-MM-DD')+" 00:00:00";
                to = moment(new Date()).locale('en').format('YYYY-MM-DD HH:mm:ss');
//        	}
            var active_chart = $('span.selected_chart').attr('id');
            var category = $('a.menu_selected').attr('id');
            var limit = $('#limit_selection').val() || 10;
            self.graph_data(from, to, active_chart, category, limit);
            self.bar_chart();
        },
        start: function(){
            var self = this;
            this._super();
            var active_chart = $('span.selected_chart').attr('id');
            var category = $('a.menu_selected').attr('id');
            var from;
            var to;
            var limit = $('#limit_selection').val() || 10;
            $("#start_date").datepicker({
                dateFormat: 'yy-mm-dd',
                onSelect: function(dateText, inst) {
                    var curr_end_date = $("#end_date").val();
                    if(curr_end_date && dateText > curr_end_date){
                        alert("Start date should not be greater than end date");
                        $("#start_date").val('');
                        $("#end_date").val('');
                    }
                    active_chart = $('span.selected_chart').attr('id');
                    category = $('a.menu_selected').attr('id');
                    from = dateText + ' 00:00:00';
                    to = $("#end_date").val() ? to : false;
                    limit = $('#limit_selection').val() || 10;
                    $('#duration_selection').prop('selectedIndex',0);
                    self.graph_data(from, to, active_chart, category, limit);
                },
            });
            $("#end_date").datepicker({
                dateFormat: 'yy-mm-dd',
                onSelect: function(dateText, inst) {
                    var curr_start_date = $("#start_date").val();
                    if(curr_start_date && curr_start_date > dateText){
                        alert("Start date should not be greater than end date");
                        $("#start_date").val('');
                        $("#end_date").val('');
                    }
                    active_chart = $('span.selected_chart').attr('id');
                    category = $('a.menu_selected').attr('id');
                    from = $("#start_date").val() ? from : false;
                    to = dateText + ' 23:59:59';
                    limit = $('#limit_selection').val() || 10;
                    $('#duration_selection').prop('selectedIndex',0);
                    self.graph_data(from, to, active_chart, category, limit);
                },
            });
            this.$('.back').click(function(){
                self.gui.back();
            });

            this.$('#duration_selection').on('change',function(){
                $("#start_date").val('');
                $("#end_date").val('');
                self.get_graph_information();
            });
            this.$('#limit_selection').on('change',function(){
                self.get_graph_information();
            });

            this.$('#top_customer').click(function(){
                if(!$('#top_customer').hasClass('menu_selected')){
                    $('#top_customer').addClass('menu_selected');
                    if(self.$('#top_products').hasClass('menu_selected')){
                        self.$('#top_products').removeClass('menu_selected');
                    }
                    if(self.$('#cashiers').hasClass('menu_selected')){
                        self.$('#cashiers').removeClass('menu_selected');
                    }
                    if(self.$('#sales_by_location').hasClass('menu_selected')){
                        self.$('#sales_by_location').removeClass('menu_selected');
                    }
                    if(self.$('#income_by_journals').hasClass('menu_selected')){
                        self.$('#income_by_journals').removeClass('menu_selected');
                    }
                    if(self.$('#top_category').hasClass('menu_selected')){
                        self.$('#top_category').removeClass('menu_selected');
                    }
                    if(self.$('#pos_benifit').hasClass('menu_selected')){
                        self.$('#pos_benifit').removeClass('menu_selected');
                    }
                }
                self.get_graph_information();
            });
            this.$('#top_products').click(function(){
                if(!$('#top_products').hasClass('menu_selected')){
                    $('#top_products').addClass('menu_selected');
                    if(self.$('#top_customer').hasClass('menu_selected')){
                        self.$('#top_customer').removeClass('menu_selected');
                    }
                    if(self.$('#cashiers').hasClass('menu_selected')){
                        self.$('#cashiers').removeClass('menu_selected');
                    }
                    if(self.$('#sales_by_location').hasClass('menu_selected')){
                        self.$('#sales_by_location').removeClass('menu_selected');
                    }
                    if(self.$('#income_by_journals').hasClass('menu_selected')){
                        self.$('#income_by_journals').removeClass('menu_selected');
                    }
                    if(self.$('#top_category').hasClass('menu_selected')){
                        self.$('#top_category').removeClass('menu_selected');
                    }
                    if(self.$('#pos_benifit').hasClass('menu_selected')){
                        self.$('#pos_benifit').removeClass('menu_selected');
                    }
                }
                self.get_graph_information();
            });
            this.$('#cashiers').click(function(){
                if(!$('#cashiers').hasClass('menu_selected')){
                    $('#cashiers').addClass('menu_selected');
                    if(self.$('#top_customer').hasClass('menu_selected')){
                        self.$('#top_customer').removeClass('menu_selected');
                    }
                    if(self.$('#top_products').hasClass('menu_selected')){
                        self.$('#top_products').removeClass('menu_selected');
                    }
                    if(self.$('#sales_by_location').hasClass('menu_selected')){
                        self.$('#sales_by_location').removeClass('menu_selected');
                    }
                    if(self.$('#income_by_journals').hasClass('menu_selected')){
                        self.$('#income_by_journals').removeClass('menu_selected');
                    }
                    if(self.$('#top_category').hasClass('menu_selected')){
                        self.$('#top_category').removeClass('menu_selected');
                    }
                    if(self.$('#pos_benifit').hasClass('menu_selected')){
                        self.$('#pos_benifit').removeClass('menu_selected');
                    }
                }
                self.get_graph_information();
            });
            this.$('#sales_by_location').click(function(){
                if(!$('#sales_by_location').hasClass('menu_selected')){
                    $('#sales_by_location').addClass('menu_selected');
                    if(self.$('#top_customer').hasClass('menu_selected')){
                        self.$('#top_customer').removeClass('menu_selected');
                    }
                    if(self.$('#top_products').hasClass('menu_selected')){
                        self.$('#top_products').removeClass('menu_selected');
                    }
                    if(self.$('#cashiers').hasClass('menu_selected')){
                        self.$('#cashiers').removeClass('menu_selected');
                    }
                    if(self.$('#income_by_journals').hasClass('menu_selected')){
                        self.$('#income_by_journals').removeClass('menu_selected');
                    }
                    if(self.$('#top_category').hasClass('menu_selected')){
                        self.$('#top_category').removeClass('menu_selected');
                    }
                    if(self.$('#pos_benifit').hasClass('menu_selected')){
                        self.$('#pos_benifit').removeClass('menu_selected');
                    }
                }
                self.get_graph_information();
            });
            this.$('#income_by_journals').click(function(){
                if(!$('#income_by_journals').hasClass('menu_selected')){
                    $('#income_by_journals').addClass('menu_selected');
                    if(self.$('#top_customer').hasClass('menu_selected')){
                        self.$('#top_customer').removeClass('menu_selected');
                    }
                    if(self.$('#top_products').hasClass('menu_selected')){
                        self.$('#top_products').removeClass('menu_selected');
                    }
                    if(self.$('#cashiers').hasClass('menu_selected')){
                        self.$('#cashiers').removeClass('menu_selected');
                    }
                    if(self.$('#sales_by_location').hasClass('menu_selected')){
                        self.$('#sales_by_location').removeClass('menu_selected');
                    }
                    if(self.$('#top_category').hasClass('menu_selected')){
                        self.$('#top_category').removeClass('menu_selected');
                    }
                    if(self.$('#pos_benifit').hasClass('menu_selected')){
                        self.$('#pos_benifit').removeClass('menu_selected');
                    }
                }
                self.get_graph_information();
            });
            this.$('#top_category').click(function(){
                if(!$('#top_category').hasClass('menu_selected')){
                    $('#top_category').addClass('menu_selected');
                    if(self.$('#top_customer').hasClass('menu_selected')){
                        self.$('#top_customer').removeClass('menu_selected');
                    }
                    if(self.$('#top_products').hasClass('menu_selected')){
                        self.$('#top_products').removeClass('menu_selected');
                    }
                    if(self.$('#cashiers').hasClass('menu_selected')){
                        self.$('#cashiers').removeClass('menu_selected');
                    }
                    if(self.$('#income_by_journals').hasClass('menu_selected')){
                        self.$('#income_by_journals').removeClass('menu_selected');
                    }
                    if(self.$('#sales_by_location').hasClass('menu_selected')){
                        self.$('#sales_by_location').removeClass('menu_selected');
                    }
                    if(self.$('#pos_benifit').hasClass('menu_selected')){
                        self.$('#pos_benifit').removeClass('menu_selected');
                    }
                }
                self.get_graph_information();
            });
            this.$('#pos_benifit').click(function(){
                if(!$('#pos_benifit').hasClass('menu_selected')){
                    $('#pos_benifit').addClass('menu_selected');
                    if(self.$('#top_customer').hasClass('menu_selected')){
                        self.$('#top_customer').removeClass('menu_selected');
                    }
                    if(self.$('#top_products').hasClass('menu_selected')){
                        self.$('#top_products').removeClass('menu_selected');
                    }
                    if(self.$('#cashiers').hasClass('menu_selected')){
                        self.$('#cashiers').removeClass('menu_selected');
                    }
                    if(self.$('#sales_by_location').hasClass('menu_selected')){
                        self.$('#sales_by_location').removeClass('menu_selected');
                    }
                    if(self.$('#income_by_journals').hasClass('menu_selected')){
                        self.$('#income_by_journals').removeClass('menu_selected');
                    }
                    if(self.$('#top_category').hasClass('menu_selected')){
                        self.$('#top_category').removeClass('menu_selected');
                    }
                }
                self.get_graph_information();
            });

            /*Bar Chart*/
            this.$('#bar_chart').click(function(){
                var order = self.pos.get_order();
                if($('#bar_chart').hasClass('selected_chart')){
//            		$('#bar_chart').removeClass('selected_chart');
//            		$('#chartContainer').html('');
                }else{
                    $('#bar_chart').addClass('selected_chart');
                    if(self.$('#pie_chart').hasClass('selected_chart')){
                        self.$('#pie_chart').removeClass('selected_chart');
                    }
                    self.get_graph_information();
                    self.bar_chart();
                }
            });
            /*Pie Chart*/
            this.$('#pie_chart').click(function(){
                if($('#pie_chart').hasClass('selected_chart')){
//            		$('#pie_chart').removeClass('selected_chart');
//            		$('#chartContainer').html('');
                }else{
                    $('#pie_chart').addClass('selected_chart');
                    if(self.$('#bar_chart').hasClass('selected_chart')){
                        self.$('#bar_chart').removeClass('selected_chart');
                    }
                    self.get_graph_information();
                    self.pie_chart();
                }
            });
        },
        graph_data: function(from, to, active_chart, category, limit){
            var self = this;
            var current_session_report = self.pos.config.current_session_report;
            var records = rpc.query({
                model: 'pos.order',
                method: 'graph_data',
                args: [from, to, category, limit, self.pos.pos_session.id, current_session_report],
            });
            records.then(function(result){
                var order = self.pos.get_order();
                var dummy_product_ids = self.pos.db.get_dummy_product_ids();
                if(result){
                    if(result.length > 0){
                        if(category == "top_products"){
                            var new_data = [];
                            result.map(function(data){
                                if(($.inArray(data[1], dummy_product_ids) == -1)){
                                    new_data.push(data);
                                }
                            });
                            order.set_result(new_data);
                        }else{
                            order.set_result(result);
                        }
                    }else{
                        order.set_result(0);
                    }
                }else{
                    order.set_result(0);
                }
                if(active_chart == "bar_chart"){
                    self.bar_chart();
                }
                if(active_chart == "pie_chart"){
                    self.pie_chart();
                }
            }).catch(function(error, event) {
                if (error.code === -32098) {
                    self.pos.db.notification('danger',_t("Connectin Lost"));
                    event.preventDefault();
                }
            });
        },
        get_graph_information: function(){
            var self = this;
            var time_period = $('#duration_selection').val();
            var active_chart = $('span.selected_chart').attr('id');
            var category = $('a.menu_selected').attr('id');
            var limit = $('#limit_selection').val() || 10;
            if(time_period == "today"){
                var from = moment(new Date()).locale('en').format('YYYY-MM-DD')+" 00:00:00";
                var to = moment(new Date()).locale('en').format('YYYY-MM-DD HH:mm:ss');
                self.graph_data(from, to, active_chart, category, limit);
            }else if(time_period == "week"){
                var from = moment(moment().startOf('week').toDate()).locale('en').format('YYYY-MM-DD')+" 00:00:00";
                var to   = moment(moment().endOf('week').toDate()).locale('en').format('YYYY-MM-DD')+" 23:59:59";
                self.graph_data(from, to, active_chart, category, limit);
            }else if(time_period == "month"){
                var from = moment(moment().startOf('month').toDate()).locale('en').format('YYYY-MM-DD')+" 00:00:00";
                var to   = moment(moment().endOf('month').toDate()).locale('en').format('YYYY-MM-DD')+" 23:59:59";
                self.graph_data(from, to, active_chart, category, limit);
            }else{
                var from = $('#start_date').val() ? $('#start_date').val() + " 00:00:00" : false;
                var to   = $('#end_date').val() ? $('#end_date').val() + " 23:59:59" : false;
                self.graph_data(from, to, active_chart, category, limit);
            }
        },
    });
    gui.define_screen({name:'graph_view', widget: GraphScreenWidget});

    var POSDashboardGraphScreenWidget = screens.ScreenWidget.extend({
        template: 'POSDashboardGraphScreenWidget',
        init: function(parent, options){
            this._super(parent, options);
            var self = this;
            this.pie_chart_journal = function(){
                var order = this.pos.get_order();
                var data = order.get_graph_data_journal();
                var dps = [];
                for(var i=0;i<data.length;i++){
                    dps.push({label: data[i].name, y: data[i].sum});
                }
                var chart = new CanvasJS.Chart("chartContainer_journal",
                {
                    zoomEnabled:true,
                    theme: "theme2",
                    data: [{
                        type: "pie",
                        showInLegend: true,
                        toolTipContent: "{y} - #percent %",
                        yValueFormatString: "",
                        legendText: "{indexLabel}",
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
            this.pie_chart_top_product = function(){
                var order = this.pos.get_order();
                var data = order.get_top_product_result();
                var dps = [];
                if(data && data[0]){
                    for(var i=0;i<data.length;i++){
                        dps.push({label: data[i].name, y: data[i].sum});
                    }
                }
                var chart = new CanvasJS.Chart("chartContainer_top_product",
                {
                    zoomEnabled:true,
                    theme: "theme2",
                    data: [{
                        type: "pie",
                        showInLegend: true,
                        toolTipContent: "{y} - #percent %",
                        yValueFormatString: "",
                        legendText: "{indexLabel}",
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
            this.pie_chart_customer = function(){
                var order = this.pos.get_order();
                var data = order.get_customer_summary();
                var dps = [];
                if(data){
                    dps.push({label: "New Customer", y: data.new_client_sale});
                    dps.push({label: "Existing Customer", y: data.existing_client_sale});
                    dps.push({label: "Without Customer", y: data.without_client_sale});
                }
                var chart = new CanvasJS.Chart("chartContainer_based_customer",
                {
                    zoomEnabled:true,
                    theme: "theme2",
                    data: [{
                        type: "pie",
                        showInLegend: true,
                        toolTipContent: "{y} - #percent %",
                        yValueFormatString: "",
                        legendText: "{indexLabel}",
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
            this.bar_chart_hourly = function(){
                var order = this.pos.get_order();
                var data = order.get_hourly_summary();
                var dps = [];
                var dps2 = [];
                if(data && data[0]){
                    for(var i=0;i<data.length;i++){
                        dps.push({label: "("+data[i].date_order_hour[0] + "-" + data[i].date_order_hour[1	]+")", y: data[i].price_total});
                        dps2.push({y: data[i].price_total});
                    }
                }
                var symbol = 'Amount-#######.00';
                var chart = new CanvasJS.Chart("chartContainer_hourly_sale",{
                    width: data && data.length > 10 ? 1200 : 0,
                    dataPointMaxWidth:25,
                    zoomEnabled:true,
                    animationEnabled: true,
                    theme: "theme3",
                    title: {
                        text: "Today Hourly Sales"
                    },
                    axisY: {
                        suffix: "",
                        title:"Amount",
                    },
                     axisX:{
                          title:"Hours",
                          labelAngle: 45,
                          interval:1
                    },
                    legend :{
                        verticalAlign: 'bottom',
                        horizontalAlign: "center"
                    },
                    data: [{
                        type: "column",
                        dataPoints: dps,
                        color:"#008080",
                    },{
                        type: "column",
                        dataPoints: dps2,
                        color:"#008080",
                    }]
                });
                chart.render();
            };
            this.bar_chart_monthly = function(){
                var order = this.pos.get_order();
                var data = order.get_month_summary();
                var dps = [];
                if(data && data[0]){
                    for(var i=0;i<data.length;i++){
                        dps.push({label: data[i].date_order_day +'/'+data[i].date_order_month, y: data[i].price_total});
                    }
                    var symbol = 'Amount-#######.00';
                    var chart = new CanvasJS.Chart("chartContainer_monthly_sale",{
                        width: data && data.length > 10 ? 1200 : 0,
                        dataPointMaxWidth:25,
                        zoomEnabled:true,
                        animationEnabled: true,
                        theme: "theme3",
                        title: {
                            text: "This Month Sales"
                        },axisY: {
                            suffix: "",
                            title:"Amount",
                        },axisX:{
                              title:"Days",
                              interval:1
                        },legend :{
                            verticalAlign: 'bottom',
                            horizontalAlign: "center"
                        },data: [{
                            type: "column",
                            indexLabel:'{y}',
                            xValueType: "dateTime",
                            indexLabelOrientation: "vertical",
                            dataPoints: dps
                        }]
                    });
                    chart.render();
                }
            };
            this.bar_chart_six_month = function(){
                var order = this.pos.get_order();
                var data = order.get_six_month_summary();
                var dps = [];
                if(data && data[0]){
                    for(var i=0;i<data.length;i++){
                        dps.push({x: data[i].date_order_month, y: data[i].price_total});
                    }
                    var symbol = 'Amount-#######.00';
                    var chart = new CanvasJS.Chart("chartContainer_six_month_sale",{
                        width: data && data.length > 10 ? 1200 : 0,
                        dataPointMaxWidth:25,
                        zoomEnabled:true,
                        animationEnabled: true,
                        theme: "theme3",
                        title: {
                            text: "Last 12 Month Sales"
                        },axisY: {
                            suffix: "",
                            title:"Amount",
                        },axisX:{
                              title:"Months",
                              interval:1
                        },legend :{
                            verticalAlign: 'bottom',
                            horizontalAlign: "center"
                        },data: [{
                            type: "column",
                            indexLabel:'{y}',
                            indexLabelOrientation: "vertical",
                            dataPoints: dps
                        }]
                    });
                    chart.render();
                }
            };
            this.bar_chart_active_session_wise_sale = function(){
                var order = this.pos.get_order();
                var data = order.get_active_session_sales();
                var dps = [];
                if(data && data[0]){
                    _.each(data,function(session){
                        dps.push({label: session.pos_session_id[0].display_name, y: session.sum});
                    })
                }
                var chart = new CanvasJS.Chart("chartContainer_session_wise_sale",{
                    width: data && data.length > 10 ? 1200 : 0,
                    dataPointMaxWidth:25,
                    zoomEnabled:true,
                    animationEnabled: true,
                    theme: "theme3",
                    title: {
                        text: "Today's Active Session(s) Sale"
                    },axisY: {
                        suffix: "",
                        title:"Amount",
                    },axisX:{
                        title:"Sessions",
                        interval:3
                    },legend :{
                        verticalAlign: 'bottom',
                        horizontalAlign: "center"
                    },data: [{
                        type: "column",
                        indexLabel:'{y}',
                        indexLabelOrientation: "vertical",
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
            this.bar_chart_closed_session_wise_sale = function(){
                var order = this.pos.get_order();
                var data = order.get_closed_session_sales();
                var dps = [];
                if(data && data[0]){
                    _.each(data,function(session){
                        dps.push({label: session.pos_session_id[0].display_name, y: session.sum});
                    })
                }
                var chart = new CanvasJS.Chart("chartContainer_closed_session_wise_sale",{
                    width: data && data.length > 10 ? 1200 : 0,
                    dataPointMaxWidth:25,
                    zoomEnabled:true,
                    animationEnabled: true,
                    theme: "theme3",
                    title: {
                        text: "Today's Closed Session(s) Sale"
                    },axisY: {
                        suffix: "",
                        title:"Amount",
                    },axisX:{
                        title:"Sessions",
                        interval:3
                    },legend :{
                        verticalAlign: 'bottom',
                        horizontalAlign: "center"
                    },data: [{
                        type: "column",
                        indexLabel:'{y}',
                        indexLabelOrientation: "vertical",
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
        },
        get_graph_information: function(){
            var from = $('#start_date_journal').val() ? $('#start_date_journal').val() + " 00:00:00" : false;
            var to   = $('#end_date_journal').val() ? $('#end_date_journal').val() + " 23:59:59" : false;
            this.graph_data_journal(from,to);
        },
        get_top_product_graph_information: function(){
            var from = $('#start_date_top_product').val() ? $('#start_date_top_product').val() + " 00:00:00" : false;
            var to   = $('#end_date_top_product').val() ? $('#end_date_top_product').val() + " 23:59:59" : false;
            this.graph_data_top_product(from,to);
        },
        get_sales_by_user_information: function(){
            var from = $('#start_date_sales_by_user').val() ? $('#start_date_sales_by_user').val() + " 00:00:00" : false;
            var to   = $('#end_date_sales_by_user').val() ? $('#end_date_sales_by_user').val() + " 23:59:59" : false;
            this.sales_by_user(from,to)
        },
        render_journal_list: function(journal_data){
            var contents = this.$el[0].querySelector('.journal-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(journal_data.length,1000); i < len; i++){
                var journal = journal_data[i];
                var journal_html = QWeb.render('JornalLine',{widget: this, journal:journal_data[i]});
                var journalline = document.createElement('tbody');
                journalline.innerHTML = journal_html;
                journalline = journalline.childNodes[1];
                contents.appendChild(journalline);
            }
        },
        render_top_product_list: function(top_product_list){
            var contents = this.$el[0].querySelector('.top-product-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(top_product_list.length,1000); i < len; i++){
                var top_product = top_product_list[i];
                var top_product_html = QWeb.render('TopProductLine',{widget: this, top_product:top_product_list[i]});
                var top_product_line = document.createElement('tbody');
                top_product_line.innerHTML = top_product_html;
                top_product_line = top_product_line.childNodes[1];
                contents.appendChild(top_product_line);
            }
        },
        graph_data_journal: function(from, to){
            var self = this;
            rpc.query({
                model: 'pos.order',
                method: 'graph_date_on_canvas',
                args: [from, to]
            },{async:false}).then(
                function(result) {
                    var order = self.pos.get_order();
                    if(result){
                        self.render_journal_list(result)
                        if(result.length > 0){
                            order.set_graph_data_journal(result);
                        }else{
                            order.set_graph_data_journal(0);
                        }
                    }else{
                        order.set_graph_data_journal(0);
                    }
                    self.pie_chart_journal();
                }).catch(function(error, event) {
                if (error.code === -32098) {
                    alert("Server closed...");
                    event.preventDefault();
                }
            });
        },
        graph_data_top_product: function(from, to){
            var self = this;
            rpc.query({
                model: 'pos.order',
                method: 'graph_best_product',
                args: [from, to]
            },{async:false}).then(
                function(result) {
                    var order = self.pos.get_order();
                    if(result){
                        self.render_top_product_list(result)
                        if(result.length > 0){
                            order.set_top_product_result(result);
                        }else{
                            order.set_top_product_result(0);
                        }
                    }else{
                        order.set_top_product_result(0);
                    }
                    self.pie_chart_top_product();
                }).catch(function(error, event) {
                if (error.code === -32098) {
                    alert("Server closed...");
                    event.preventDefault();
                }
            });
        },
        sales_by_user: function(from, to){
            var self = this;
            rpc.query({
                model: 'pos.order',
                method: 'orders_by_salesperson',
                args: [from,to]
            },{async:false}).then(function(result) {
                if(result){
                    self.render_user_wise_sales(result)
                }
            });
        },
        sales_from_session: function(){
            var self = this;
            rpc.query({
                model: 'pos.order',
                method: 'session_details_on_canvas',
            },{async:false}).then(function(result) {
                if(result){
                    if(result){
                        if(result.active_session && result.active_session[0]){
                            self.pos.get_order().set_active_session_sales(result.active_session);
                        }
                        if(result.close_session && result.close_session[0]){
                            self.pos.get_order().set_closed_session_sales(result.close_session)
                        }
                    }
                }
            });
        },
        render_user_wise_sales: function(sales_users){
            var contents = this.$el[0].querySelector('.user-wise-sales-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(sales_users.length,1000); i < len; i++){
                var user_data = sales_users[i];
                var user_sales_html = QWeb.render('UserSalesLine',{widget: this, user_sales:sales_users[i]});
                var user_sales_line = document.createElement('tbody');
                user_sales_line.innerHTML = user_sales_html;
                user_sales_line = user_sales_line.childNodes[1];
                contents.appendChild(user_sales_line);
            }
        },
        show: function(){
            var self = this;
            this._super();
            this.$('.back').click(function(){
                self.gui.show_screen('products');
            });
            var today = moment().locale('en').format("YYYY-MM-DD")
            $("#start_date_journal").val(today);
            $("#end_date_journal").val(today);
            $("#start_date_top_product").val(today);
            $("#end_date_top_product").val(today);
            $("#start_date_sales_by_user").val(today);
            $("#end_date_sales_by_user").val(today);
            var start_date = false;
            var end_date = false;
            var active_chart = $('span.selected_chart').attr('id');
            $("#start_date_journal").datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_end_date = $("#end_date_journal").val();
                    if(curr_end_date && dateText > curr_end_date){
                        alert("Start date should not be greater than end date");
                        $("#start_date_journal").val('');
                        $("#end_date_journal").val('');
                    }
                    start_date = dateText;
                    var active_chart = $('span.selected_chart').attr('id');
                    self.graph_data_journal(start_date, end_date);
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });
            $("#end_date_journal").datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_start_date = $("#start_date_journal").val();
                    if(curr_start_date && curr_start_date > dateText){
                        alert("Start date should not be greater than end date");
                        $("#start_date_journal").val('');
                        $("#end_date_journal").val('');
                    }
                    end_date = dateText;
                    var active_chart = $('span.selected_chart').attr('id');
                    self.graph_data_journal(start_date, end_date);
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });
            $("#start_date_top_product").datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_end_date = $("#end_date_top_product").val();
                    if(curr_end_date && dateText > curr_end_date){
                        alert("Start date should not be greater than end date");
                        $("#start_date_top_product").val('');
                        $("#end_date_top_product").val('');
                    }
                    start_date = dateText;
                    var active_chart = $('span.selected_chart').attr('id');
                    self.graph_data_top_product(start_date, end_date);
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });
            $("#end_date_top_product").datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_start_date = $("#start_date_top_product").val();
                    if(curr_start_date && curr_start_date > dateText){
                        alert("Start date should not be greater than end date");
                        $("#start_date_top_product").val('');
                        $("#end_date_top_product").val('');
                    }
                    end_date = dateText;
                    var active_chart = $('span.selected_chart').attr('id');
                    self.graph_data_top_product(start_date, end_date);
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });
            $("#start_date_sales_by_user").datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_end_date = $("#end_date_sales_by_user").val();
                    if(curr_end_date && dateText > curr_end_date){
                        alert("Start date should not be greater than end date");
                        $("#start_date_sales_by_user").val('');
                        $("#end_date_sales_by_user").val('');
                    }
                    start_date = dateText;
                    self.sales_by_user(start_date,end_date)
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });
            $("#end_date_sales_by_user").datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_start_date = $("#start_date_sales_by_user").val();
                    if(curr_start_date && curr_start_date > dateText){
                        alert("Start date should not be greater than end date");
                        $("#start_date_sales_by_user").val('');
                        $("#end_date_sales_by_user").val('');
                    }
                    end_date = dateText;
                    self.sales_by_user(start_date,end_date)
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });
            rpc.query({
                model: 'pos.order',
                method: 'get_dashboard_data',
                args: []
            },{async:false}).then(function(result) {
                self.pos.dashboard_data = result;
                if(result){
                    $('#total_active_session').text(result['active_sessions'])
                    $('#total_closed_session').text(result['closed_sessions'])
                    $('#total_sale_count').text(result['total_orders']);
                    $('#total_sale_amount').text(self.chrome.format_currency(result['total_sales']));
                    var order = self.pos.get_order();
                    order.set_hourly_summary(result['sales_based_on_hours']);
                    order.set_month_summary(result['current_month']);
                    order.set_six_month_summary(result['last_6_month_res']);
                    order.set_customer_summary(result['client_based_sale']);
                    self.get_graph_information();
                    self.get_top_product_graph_information();
                    self.get_sales_by_user_information();
                    self.pie_chart_journal();
                    self.pie_chart_top_product();
                    self.bar_chart_hourly();
                    self.bar_chart_monthly();
                    self.bar_chart_six_month();
                    self.pie_chart_customer();
                    self.sales_from_session();
//        			self.bar_chart_active_session_wise_sale();
//        			self.bar_chart_closed_session_wise_sale();
                }
            });
        },
    });
    gui.define_screen({name:'pos_dashboard_graph_view', widget: POSDashboardGraphScreenWidget});

    var ProductExpiryDeshboardWidget = screens.ScreenWidget.extend({
        template: 'ProductExpiryDeshboardWidget',
        init: function(parent, options){
            this._super(parent, options);
            var self = this;
            this.bar_chart = function(){
                var order = self.pos.get_order();
                var data = order.get_result_expire_graph();
                var dps = [];
                if(data){
                    for(var i=0;i<data.length;i++){
                        dps.push({label: data[i].product_name, y: data[i].qty});
                    }
                }
                var symbol = 'Qty-#######.00';
                var chart = new CanvasJS.Chart("chartContainer_expiry_dashboard",{
                    width: data && data.length > 10 ? 1200 : 0,
                    dataPointMaxWidth:25,
                    zoomEnabled:true,
                    theme: "theme3",
                    title: {
                        text: $('a.menu_selected').text()
                    },
                    axisY: {
                        suffix: ""
                    },
                    legend :{
                        verticalAlign: 'bottom',
                        horizontalAlign: "center"
                    },
                    data: [{
                        type: "column",
                        bevelEnabled: true,
                        indexLabel:'{y}',
                        indexLabelOrientation: "vertical", //horizontal
                        yValueFormatString:symbol || '',
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
            this.pie_chart = function(){
                var order = this.pos.get_order();
                var data = order.get_result_expire_graph();
                var dps = [];
                for(var i=0;i<data.length;i++){
                    dps.push({label: data[i].product_name, y: data[i].qty});
                }
                var chart = new CanvasJS.Chart("chartContainer_expiry_dashboard",
                {
                    zoomEnabled:true,
                    theme: "theme2",
                    title:{
                        text: $('a.menu_selected').text()
                    },
                    data: [{
                        type: "pie",
                        showInLegend: true,
                        toolTipContent: "{y} - #percent %",
                        yValueFormatString: "",
                        legendText: "{indexLabel}",
                        dataPoints: dps
                    }]
                });
                chart.render();
            };
        },
        start: function(){
            var self = this;
            self._super();
            $("#explorer_text").text("More");
            this.$('#explorable_div').click(function(){
                if($(this).hasClass('hidden')){
                    $(this).removeClass('hidden');
                    $(this).addClass('explore');
                    $('.expired-by-product-list').addClass('explore')
                    $('.expired-by-product-container').addClass('explore')
                    $("#explorer_text").text("Less");
                } else{
                    $(this).removeClass('explore');
                    $(this).addClass('hidden');
                    $('.expired-by-product-list').removeClass('explore')
                    $('.expired-by-product-container').removeClass('explore')
                    $("#explorer_text").text("More");
                }
            });
            /*Bar Chart*/
            this.$('#bar_chart_expire_dashboard').click(function(){
                var order = self.pos.get_order();
                if($('#bar_chart_expire_dashboard').hasClass('selected_chart')){
                }else{
                    $('#bar_chart_expire_dashboard').addClass('selected_chart');
                    if(self.$('#pie_chart_expire_dashboard').hasClass('selected_chart')){
                        self.$('#pie_chart_expire_dashboard').removeClass('selected_chart');
                    }
                    self.get_graph_information();
                    self.bar_chart();
                }
            });
            /*Pie Chart*/
            this.$('#pie_chart_expire_dashboard').click(function(){
                if($('#pie_chart_expire_dashboard').hasClass('selected_chart')){
                }else{
                    $('#pie_chart_expire_dashboard').addClass('selected_chart');
                    if(self.$('#bar_chart_expire_dashboard').hasClass('selected_chart')){
                        self.$('#bar_chart_expire_dashboard').removeClass('selected_chart');
                    }
                    self.get_graph_information();
                    self.pie_chart();
                }
            });
            this.$('.location-list-contents').delegate('.location-line','click',function(event){
                var location_id = parseInt($(this).data('id'));
                var records = self.get_products_qty_based__location(location_id)
                self.pos.product_detail_record = records;
                var title = "Location : " + records[0].location_id[1];
                self.pos.set_title_detail_expire_screen(title)
                self.gui.show_screen('product_detail_list');
            });
            this.$('.warehouse-list-contents').delegate('.warehouse-line','click',function(event){
                var location_id = parseInt($(this).data('id'));
                var warehouse_name = self.pos.warehouse_name_by_loc_id[location_id]
                if(warehouse_name){
                    var warehouse_title = "Warehouse : " + warehouse_name
                    self.pos.set_title_detail_expire_screen(warehouse_title)
                }
                var records = self.get_products_qty_based__location(location_id)
                self.pos.product_detail_record = records;
                self.gui.show_screen('product_detail_list');
            });
            this.$('.categories-view-container').delegate('.expired-product-count-category','click',function(event){
                var category_id = parseInt($(this).data('id'));
                self.pos.set_title_detail_expire_screen(false)
                var params = {
                    model: 'product.product',
                    method: 'category_expiry',
                    args:[self.pos.company.id,category_id],
                 }
                rpc.query(params, {async: false})
                .then(function(records){
                    self.pos.product_detail_record = records;
                    self.gui.show_screen('product_detail_list');
                });
            });
            this.$('span.out_stock_category_clear').click(function(e){
                self.clear_search();
                var input = $('#search_category');
                input.val('');
                input.focus();
            });
        },
        clear_search: function(){
            var exprire_categories = self.pos.report_records['category_near_expire'];
            this.render_list_category(exprire_categories);
        },
        get_graph_information: function(){
            var self = this;
            var active_chart = $('span.selected_chart').attr('id');
            var from = $('#start_date_expire_deshboard').val() ? $('#start_date_expire_deshboard').val() + " 00:00:00" : false;
            var to   = $('#end_date_expire_deshboard').val() ? $('#end_date_expire_deshboard').val() + " 23:59:59" : false;
            self.graph_data(from, to, active_chart);
        },
        graph_data: function(from, to, active_chart){
            var self = this;
            rpc.query({
                model: 'product.product',
                method: 'graph_date_on_canvas',
                args: [from, to]
            },{async:false}).then(
                function(result) {
                    var order = self.pos.get_order();
                    if(result){
                        if(result.length > 0){
                            order.set_result_expire_graph(result);
                        }else{
                            order.set_result_expire_graph(0);
                        }
                    }else{
                        order.set_result_expire_graph(0);
                    }
                    if(active_chart == "bar_chart"){
                        self.bar_chart();
                    }
                    if(active_chart == "pie_chart"){
                        self.pie_chart();
                    }
                }).catch(function(error, event) {
                if (error.code === -32098) {
                    alert("Server closed...");
                    event.preventDefault();
                }
            });
        },
        filter:"all",
        date: "all",
        show: function(){
            var self = this;
            this._super();
            $('#login_user_expire_screen').text(self.pos.get_cashier().name)
            var params = {
                model: 'product.product',
                method: 'front_search_product_expiry',
             }
            rpc.query(params, {async: false})
            .then(function(records){
                self.pos.report_records = records;
                self.pos.warehouse_name_by_loc_id = {};
                if (records.warehouse_wise_expire && records.warehouse_wise_expire[0]){
                    _.each(records.warehouse_wise_expire, function(warehouse){
                        self.pos.warehouse_name_by_loc_id[warehouse.location_id] = warehouse.warehouse_name;
                    })
                }
                self.pos.db.add_expire_categ(records['category_near_expire'])
                $('#60days').text(records['60']);
                $('#30days').text(records['30']);
                $('#15days').text(records['15']);
                $('#10days').text(records['10']);
                $('#5days').text(records['5']);
                $('#1day').text(records['1']);
                $('#near_expired').text(records['near_expired']);
            });
            $('#near_expired').click(function(){
                var params = {
                    model: 'stock.quant',
                    method: 'search_read',
                    domain:[['state_check','=','near_expired'],['company_id.id','=', self.pos.company.id]],
                 }
                rpc.query(params, {async: false})
                .then(function(records){
                    self.pos.product_detail_record = records;
                    self.gui.show_screen('product_detail_list');
                });
            });
            self.graph_data(false, false, 'bar_chart');
            this.$('.back').click(function(){
                self.gui.show_screen('products');
            });
            var start_date = false;
            var end_date = false;
            var active_chart = $('span.selected_chart').attr('id');
            this.$('input#start_date_expire_deshboard').datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_end_date = $("#end_date_expire_deshboard").val();
                    if(curr_end_date && dateText > curr_end_date){
                        alert("Start date should not be greater than end date");
                        $("#start_date_expire_deshboard").val('');
                        $("#end_date_expire_deshboard").val('');
                    }
                    start_date = dateText;
                    var active_chart = $('span.selected_chart').attr('id');
                    self.graph_data(start_date, end_date, active_chart);
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });

            $("#end_date_expire_deshboard").datepicker({
                dateFormat: 'yy-mm-dd',
                autoclose: true,
                closeText: 'Clear',
                showButtonPanel: true,
                onSelect: function(dateText, inst) {
                    var curr_start_date = $("#start_date_expire_deshboard").val();
                    if(curr_start_date && curr_start_date > dateText){
                        alert("Start date should not be greater than end date");
                        $("#start_date_expire_deshboard").val('');
                        $("#end_date_expire_deshboard").val('');
                    }
                    end_date = dateText;
                    var active_chart = $('span.selected_chart').attr('id');
                    self.graph_data(start_date, end_date, active_chart);
                },
            }).focus(function(){
                var thisCalendar = $(this);
                $('.ui-datepicker-close').click(function() {
                    thisCalendar.val('');
                });
            });

            $("#start_date_expire_deshboard").val('');
            $("#end_date_expire_deshboard").val('');
            var search_timeout = null;
            if(self.pos.report_records && self.pos.report_records['category_near_expire'] && self.pos.report_records['category_near_expire'][0]){
                self.render_list_category(self.pos.report_records['category_near_expire']);
            }
            this.$('#search_category').on('keypress',function(event){
                clearTimeout(search_timeout);
                var query = this.value;
                search_timeout = setTimeout(function(){
                    self.perform_search(query,event.which === 13);
                },70);
            });
            if(self.pos.report_records && self.pos.report_records['location_wise_expire'] && self.pos.report_records['location_wise_expire'][0]){
                self.render_location_list(self.pos.report_records['location_wise_expire'])
            }
            if(self.pos.report_records && self.pos.report_records['warehouse_wise_expire'] && self.pos.report_records['warehouse_wise_expire'][0]){
                self.render_warehouse_list(self.pos.report_records['warehouse_wise_expire'])
            }
            $('.expired-product-count').click(function(){
                var day_exp =  parseInt($(this).data('id'));
                self.pos.set_title_detail_expire_screen(false)
                var params = {
                    model: 'product.product',
                    method: 'get_expire_data_near_by_day',
                    args:[self.pos.company.id,day_exp],
                 }
                rpc.query(params, {async: false})
                .then(function(records){
                    self.pos.product_detail_record = records;
                    self.gui.show_screen('product_detail_list');
                });
            });
        },
        get_products_qty_based__location: function(location_id){
            var params = {
                model: 'stock.quant',
                method: 'search_read',
                domain:[['state_check','=','near_expired'],['location_id','=',location_id]],
             }
            var location_line_detail;
            rpc.query(params, {async: false})
            .then(function(records){
                location_line_detail = records
            });
            return location_line_detail;
        },
        render_location_list: function(location_data){
            var contents = this.$el[0].querySelector('.location-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(location_data.length,1000); i < len; i++){
                var location    = location_data[i];
                var location_html = QWeb.render('LocationLine',{widget: this, location:location_data[i]});
                var locationline = document.createElement('tbody');
                locationline.innerHTML = location_html;
                locationline = locationline.childNodes[1];
                contents.appendChild(locationline);
            }
        },
        render_warehouse_list: function(warehouse_data){
            var contents = this.$el[0].querySelector('.warehouse-list-contents');
            contents.innerHTML = "";
            for(var i = 0, len = Math.min(warehouse_data.length,1000); i < len; i++){
                var warehouse = warehouse_data[i];
                var warehouse_html = QWeb.render('WarehouseLine',{widget: this, warehouse:warehouse_data[i]});
                var warehouseline = document.createElement('tbody');
                warehouseline.innerHTML = warehouse_html;
                warehouseline = warehouseline.childNodes[1];
                contents.appendChild(warehouseline);
            }
        },
        perform_search: function(query, associate_result){
            var self = this;
            if(query){
                var exprire_categories = self.pos.db.search_exprire_categories(query);
                this.render_list_category(exprire_categories);
            }else{
                var exprire_categories = self.pos.report_records['category_near_expire'];
                this.render_list_category(exprire_categories);
            }
        },
        render_list_category: function(category){
            var contents = this.$el[0].querySelector('.categories-view-container');
            contents.innerHTML = "";
            for(var i=0;i<category.length;i++){
                var report_list = category[i];
                var reportsline_html = QWeb.render('ExpireByCategory',{widget: this, category:category[i]});
                var report_tbody = document.createElement('tbody');
                report_tbody.innerHTML = reportsline_html;
                report_tbody = report_tbody.childNodes[1];
                contents.appendChild(report_tbody);
            }
        },
    });
    gui.define_screen({name:'product_expiry_deshboard', widget: ProductExpiryDeshboardWidget});

    screens.ReceiptScreenWidget.include({
        renderElement: function() {
            var self = this;
            this._super();
            var customer_display = this.pos.config.customer_display;
            this.$('.next').click(function(){
            	if(self.pos.get_order()){
            		if(customer_display){
            			self.pos.get_order().mirror_image_data(true);
            		}
            	}
            });
        },
        show: function(){
            var self = this;
            var order = this.pos.get_order();
            var vouchers = order.get_voucher();
            var counter = [];
            if(self.pos.config.enable_print_valid_days && self.pos.get_cashier().access_print_valid_days){
                var order_category_list = [];
                var orderlines = order.get_orderlines();
                _.each(orderlines, function(orderline){
                    if(orderline.get_product().pos_categ_id){
                        var category = self.pos.db.get_category_by_id(orderline.get_product().pos_categ_id[0]);
                        if (category && category.return_valid_days > 0){
                            order_category_list.push({
                                "id": category.id,
                                "name": category.name,
                                "return_valid_days": category.return_valid_days || self.pos.config.default_return_valid_days,
                            });
                        } else if(category && category.return_valid_days < 1){
                            var temp = self.find_parent_category(category);
                            order_category_list.push(temp);
                        }
                    } else {
                        order_category_list.push({
                            "id": self.pos.db.root_category_id,
                            "name": "others",
                            "return_valid_days": self.pos.config.default_return_valid_days,
                        });
                    }
                });
                this.final_order_category_list = _.uniq(order_category_list, function(item){
                    return item.id;
                });
            }
            if(self.pos.config.enable_gift_voucher){
                if(order.get_voucher()){
                    var voucher_use = _.countBy(vouchers, 'voucher_code');
                    _.each(vouchers, function(voucher){
                        if(_.where(counter, {voucher_code: voucher.voucher_code}).length < 1){
                            counter.push({
                                voucher_name : voucher.display_name,
                                voucher_code: voucher.voucher_code,
                                remaining_redeemption: voucher.redemption_customer - (voucher.already_redeemed > 0 ? voucher.already_redeemed + voucher_use[voucher.voucher_code] : voucher_use[voucher.voucher_code]),
                            });
                        }
                    });
                    order.set_remaining_redeemption(counter);
                }
            }
            this._super();

        },
        find_parent_category: function(category){
            var self = this;
            if (category){
                if(!category.parent_id){
                    return {
                        "id": category.id,
                        "name": category.name,
                        "return_valid_days": category.return_valid_days || self.pos.config.default_return_valid_days,
                    };
                }
                if(category.return_valid_days > 0){
                    return {
                        "id": category.id,
                        "name": category.name,
                        "return_valid_days": category.return_valid_days || self.pos.config.default_return_valid_days,
                    };
                } else {
                    category = self.pos.db.get_category_by_id(category.parent_id[0]);
                    return self.find_parent_category(category)
                }
            }
        },
        render_receipt: function() {
            var order = this.pos.get_order();
            if (order.get_free_data()){
                this.$('.pos-receipt-container').html(QWeb.render('FreeTicket',{
                    widget:this,
                    order: order,
                }));
            }else if(order.get_receipt()){
                var no = $('input#no_of_copies').val()
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
                var receipt = "";
                for(var i=0;i < no;i++){
                    receipt += QWeb.render('CustomTicket',{
                        widget:this,
                        order: order,
                        receipt: order.export_for_printing(),
                        order_report : order_data,
                        category_report : category_data,
                        payment_report : payment_data
                    })
                }
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_order_summary_report_mode()){
                var no = $('#no_of_summary').val();
                var product_summary_key = Object.keys(order.get_product_summary_report()['product_summary'] ? order.get_product_summary_report()['product_summary'] :false );
                if(product_summary_key.length > 0){
                    var product_summary_data = order.get_product_summary_report()['product_summary'];
                } else {
                    var product_summary_data = false;
                }
                var category_summary_key = Object.keys(order.get_product_summary_report()['category_summary']);
                 if(category_summary_key.length > 0){
                    var category_summary_data = order.get_product_summary_report()['category_summary'];
                } else {
                    var category_summary_data = false;
                }
                 var payment_summary_key = Object.keys(order.get_product_summary_report()['payment_summary']);
                 if(payment_summary_key.length > 0){
                     var payment_summary_data = order.get_product_summary_report()['payment_summary'];
                } else {
                    var payment_summary_data = false;
                }
                var location_summary_key = Object.keys(order.get_product_summary_report()['location_summary']);
                 if(location_summary_key.length > 0){
                     var location_summary_data = order.get_product_summary_report()['location_summary'];
                } else {
                    var location_summary_data = false;
                }
                var receipt = "";
                for (var step = 0; step < no; step++) {
                    receipt += QWeb.render('ProductSummaryReport',{
                        widget:this,
                        order: order,
                        receipt: order.export_for_printing(),
                        product_details: product_summary_data,
                        category_details: category_summary_data,
                        payment_details: payment_summary_data,
                        location_details:location_summary_data,
                    })
                }
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_sales_summary_mode()) {
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
                var receipt = "";
                receipt = QWeb.render('PaymentSummaryReport',{
                    widget:this,
                    order: order,
                    receipt: order.export_for_printing(),
                    journal_details: journal_summary_data,
                    salesmen_details: sales_summary_data,
                    total_summary : total_summary_data
                })
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_receipt_mode()){
                var data = order.get_product_vals();
                var receipt = "";
                receipt = QWeb.render('OutStockPosReport',{
                    widget:this,
                    order: order,
                    receipt: order.export_for_printing(),
                    location_data: order.get_location_vals(),
                    product_data: data,
                })
                this.$('.pos-receipt-container').html(receipt);
            } else if(order.get_money_inout_details()){
                $('.pos-receipt-container', this.$el).html(QWeb.render('MoneyInOutTicket',{
                   widget:this,
                   order: order,
                   money_data: order.get_money_inout_details(),
                }));
            } else if(order.get_cash_register()){
                $('.pos-receipt-container', this.$el).html(QWeb.render('CashInOutStatementReceipt',{
                    widget:this,
                    order: order,
                    statements: order.get_cash_register(),
                }));
            } else if(order.get_delivery_payment_data()){
                $('.pos-receipt-container', this.$el).html(QWeb.render('DeliveryPaymentTicket',{
                    widget:this,
                    order: order,
                    pos_order: order.get_delivery_payment_data(),
                 }));
            } else{
                if(order && order.is_reprint){
                    this.$('.pos-receipt-container').html(order.print_receipt_html);
                }else{
                    if(order.get_credit_payment()){
                        this.print_credit_receipt(2);
                    }else{
                        this.print_credit_receipt(1);
                    }
//                    this.$('.pos-receipt-container').html(QWeb.render('PosTicket',{
//                        widget:this,
//                        order: order,
//                        receipt: order.export_for_printing(),
//                        orderlines: order.get_orderlines(),
//                        paymentlines: order.get_paymentlines(),
//                    }));
                }
            }

        },
        print_credit_receipt : function(times){
            var order = this.pos.get_order();
            var receipt = "";
            for (var step = 0; step < times; step++) {
                receipt += QWeb.render('PosTicket',{
                    widget:this,
                    order: order,
                    receipt: order.export_for_printing(),
                    orderlines: order.get_orderlines(),
                    paymentlines: order.get_paymentlines(),
                })
            }
            this.$('.pos-receipt-container').html(receipt);
        },

        render_change: function() {
            this._super();
            this.$('.total-value').html(this.format_currency(this.pos.get_order().getNetTotalTaxIncluded()));
        },
        print_xml: function() {
            var order = this.pos.get_order();
            var env = {
                widget:  this,
                pos: this.pos,
                order: this.pos.get_order(),
                receipt: this.pos.get_order().export_for_printing(),
                paymentlines: this.pos.get_order().get_paymentlines()
            };
            if(order.get_free_data()){
                var receipt = QWeb.render('XmlFreeTicket',env);
            } else if(order.get_money_inout_details()){
                var receipt = QWeb.render('XMLMoneyInOutTicket',{
                    widget:this,
                    order: order,
                    money_data: order.get_money_inout_details(),
                 });
            } else if(order.get_delivery_payment_data()){
                var data = {
                    widget:  this,
                    pos: this.pos,
                    order: this.pos.get_order(),
                    pos_order: order.get_delivery_payment_data(),
                }
                var receipt = QWeb.render('XmlDeliveryPaymentTicket',data);
            } else{
                if(order && order.is_reprint){
                    order.is_reprint = false;
                    this.pos.proxy.print_receipt(order.print_xml_receipt_html);
                    return this.pos.get_order()._printed = true;
                }else{
                    var receipt = "";
                    if(order.get_credit_payment()){
                        for (var step = 0; step < 2; step++) {
                            receipt += QWeb.render('XmlReceipt',env);
                        }
                    }else{
                        receipt = QWeb.render('XmlReceipt',env);
                    }
                }
            }
            this.pos.proxy.print_receipt(receipt);
            this.pos.get_order()._printed = true;
        },
    });

    screens.ActionpadWidget.include({
        renderElement: function() {
            var self = this;
            this._super();
            this.$('.empty-cart').click(function(){
                var order = self.pos.get_order();
                var lines = order.get_orderlines();
                if(lines.length > 0){
                    self.gui.show_popup('confirm',{
                        'title': _t('Empty Cart ?'),
                        'body': _t('You will lose all items associated with the current order'),
                        confirm: function(){
                            order.empty_cart();
                            order.mirror_image_data();
                        },
                    });
                } else {
                    $('div.order-empty').animate({
                        color: '#FFCCCC',
                    }, 1000, 'linear', function() {
                          $(this).css('color','#DDD');
                    });
                }
            });
            this.$('.pay').unbind('click').click(function(){
                var order = self.pos.get_order();
                var partner = order.get_client();
                var has_valid_product_lot = _.every(order.orderlines.models, function(line){
                    return line.has_valid_product_lot();
                });
                if(partner){
                    var params = {
                    model: 'account.invoice',
                    method: 'get_outstanding_info',
                    args: [partner.id]
                    }
                    rpc.query(params, {async: false}).then(function(res){
                        if(res){
                            partner['deposite_info'] = res;
                            _.each(res['content'], function(value){
                                  self.pos.amount = value['amount'];
                            });
                        }
                    });
                }

                if(!has_valid_product_lot){
                    self.gui.show_popup('confirm',{
                        'title': _t('Empty Serial/Lot Number'),
                        'body':  _t('One or more product(s) required serial/lot number.'),
                        confirm: function(){
                            if(!self.pos.config.restrict_lot_serial){
//                            	self.gui.show_screen('payment');
                                if(self.pos.get_cashier().pos_user_type=="cashier" || !self.pos.cofig.orders_sync){
                                    self.gui.show_screen('payment');
                                } else{
                                    var order = self.pos.get_order();
                                    if(order.is_empty()){
                                        $('div.order-empty').animate({
                                            color: '#FFCCCC',
                                        }, 1000, 'linear', function() {
                                              $(this).css('color','#DDD');
                                        });
                                        return
                                    }
                                    if(self.pos.config.enable_delivery_charges){
                                        var time = order.get_delivery_time();
                                        var address = order.get_delivery_address();
                                        var date = order.get_delivery_date();
                                        var is_deliver = order.get_is_delivery();
                                        var delivery_user_id = order.get_delivery_user_id();
                                        if(is_deliver && !order.get_client()){
                                            return self.pos.db.notification('danger',_t('Customer is required to validate delivery order!'));
                                        }
                                        if(is_deliver && (!date || !time || !address || !delivery_user_id)){
                                            self.pos.db.notification('danger',_t('Delivery information required to validate order!'));
                                            return self.gui.show_popup('delivery_detail_popup',{'call_from':'draft_order'});
                                        } else{
                                            var credit = order.get_total_with_tax() - order.get_total_paid();
                                            var client = order.get_client();
                                            if (client && credit > client.remaining_credit_limit){
                                                setTimeout(function(){
                                                    return self.gui.show_popup('max_limit',{
                                                        remaining_credit_limit: client.remaining_credit_limit,
                                                        draft_order: true,
                                                    });
                                                },0)
                                            } else {
                                                setTimeout(function(){
                                                    self.gui.show_popup('confirm',{
                                                        'title': _t('Order Quotation'),
                                                        'body': _t('Do you want to create order as quotation?'),
                                                        confirm: function(){
                                                            self.pos.push_order(order);
                                                            self.gui.show_screen('receipt');
                                                        },
                                                    });
                                                },0)
                                            }
                                        }
                                        if(is_deliver && date && time && address && delivery_user_id){
                                            order.set_delivery_type('pending');
                                        }
                                    }else{
                                        order.set_delivery_type('none');
                                        self.gui.show_popup('confirm',{
                                            'title': _t('Order Quotation'),
                                            'body': _t('Do you want to create order as quotation?'),
                                            confirm: function(){
                                                self.pos.push_order(order);
                                                self.gui.show_screen('receipt');
                                            },
                                        });
                                    }
                                }
                            }
                        },
                    });
                }else{
                    if(self.pos.get_cashier().pos_user_type=="cashier" || !self.pos.config.orders_sync){
                        self.gui.show_screen('payment');
                    } else{
                        var order = self.pos.get_order();
                        if(order.is_empty()){
                            $('div.order-empty').animate({
                                color: '#FFCCCC',
                            }, 1000, 'linear', function() {
                                  $(this).css('color','#DDD');
                            });
                            return
                        }
                        if(self.pos.config.enable_delivery_charges){
                            var time = order.get_delivery_time();
                            var address = order.get_delivery_address();
                            var date = order.get_delivery_date();
                            var is_deliver = order.get_is_delivery();
                            var delivery_user_id = order.get_delivery_user_id();
                            if(is_deliver && !order.get_client()){
                                return self.pos.db.notification('danger',_t('Customer is required to validate delivery order!'));
                            }
                            if(is_deliver && (!date || !time || !address || !delivery_user_id)){
                                self.pos.db.notification('danger',_t('Delivery information required to validate order!'));
                                return self.gui.show_popup('delivery_detail_popup',{'call_from':'draft_order'});
                            } else{
                                var credit = order.get_total_with_tax() - order.get_total_paid();
                                var client = order.get_client();
                                if (client && credit > client.remaining_credit_limit){
                                    setTimeout(function(){
                                        return self.gui.show_popup('max_limit',{
                                            remaining_credit_limit: client.remaining_credit_limit,
                                            draft_order: true,
                                        });
                                    },0)
                                } else {
                                    setTimeout(function(){
                                        self.gui.show_popup('confirm',{
                                            'title': _t('Order Quotation'),
                                            'body': _t('Do you want to create order as quotation?'),
                                            confirm: function(){
                                                self.pos.push_order(order);
                                                self.gui.show_screen('receipt');
                                            },
                                        });
                                    },0)
                                }
                            }
                            if(is_deliver && date && time && address && delivery_user_id){
                                order.set_delivery_type('pending');
                            }
                        }else{
                            order.set_delivery_type('none');
                            self.gui.show_popup('confirm',{
                                'title': _t('Order Quotation'),
                                'body': _t('Do you want to create order as quotation?'),
                                confirm: function(){
                                    self.pos.push_order(order);
                                    self.gui.show_screen('receipt');
                                },
                            });
                        }
                    }
                }
            });
            this.$('.set-customer').click(function(){
                self.gui.show_screen('clientlist');
            });
        }
    });



   });