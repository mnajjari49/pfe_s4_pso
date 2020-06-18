# -*- coding: utf-8 -*-
#################################################################################
# Author      : Acespritech Solutions Pvt. Ltd. (<www.acespritech.com>)
# Copyright(c): 2012-Present Acespritech Solutions Pvt. Ltd.
# All Rights Reserved.
#
# This program is copyright property of the author mentioned above.
# You can`t redistribute it and/or modify it.
#
#################################################################################

from odoo import models, fields, api, tools, _
from datetime import datetime, date, time, timedelta
from dateutil.relativedelta import relativedelta
from odoo.exceptions import UserError, ValidationError, Warning
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
from odoo.addons.account.wizard.pos_box import CashBox
import time
import pytz
from pytz import timezone
from odoo.tools import float_is_zero
import logging
import psycopg2
from odoo import SUPERUSER_ID
from operator import itemgetter
from timeit import itertools

_logger = logging.getLogger(__name__)


class PosConfig(models.Model):
    _inherit = 'pos.config'

    @api.constrains('time_interval')
    def _check_time_interval(self):
        if self.enable_automatic_lock and self.time_interval < 0:
            raise Warning(_('Time Interval Not Valid'))

    @api.onchange('multi_shop_id')
    def on_change_multi_shop_id(self):
        if self.multi_shop_id:
            self.stock_location_id = self.multi_shop_id.location_id.id

    def write(self, vals):
        if vals.get('module_pos_restaurant'):
            raise Warning(_("You Can't Use Restaurant While Using FlexiPharmacy!"))
        res = super(PosConfig, self).write(vals)
        return res

    @api.model
    def create(self, values):
        if values.get('module_pos_restaurant'):
            raise Warning(_("You Can't Use Restaurant While Using FlexiPharmacy!"))
        res = super(PosConfig, self).create(values)
        return res

    @api.model
    def search(self, args, offset=0, limit=None, order=None, count=False):
        user_rec = self.env['res.users'].browse(self._uid)
        erp_manager_id = self.env['ir.model.data'].get_object_reference('base',
                                                                        'group_erp_manager')[1]
        if user_rec and erp_manager_id not in user_rec.groups_id.ids:
            if user_rec.shop_ids:
                args += ['|', ('multi_shop_id', 'in', user_rec.shop_ids.ids), ('multi_shop_id', '=', False)]
            res = super(PosConfig, self).search(args=args, offset=offset, limit=limit, order=order, count=count)
        else:
            res = super(PosConfig, self).search(args=args, offset=offset, limit=limit, order=order, count=count)
        return res

    @api.model
    def get_outstanding_info(self):
        return True

    pos_graph = fields.Boolean("POS Graph")
    x_report = fields.Boolean("X-Report")
    payment_summary = fields.Boolean(string="Payment Summary")
    print_product_summary = fields.Boolean(string="Product Summary Report")
    enable_order_summary = fields.Boolean(string='Order Summary Report')
    print_audit_report = fields.Boolean("Print Audit Report")
    today_sale_report = fields.Boolean("Today Sale Report")
    current_session_report = fields.Boolean("Current Session Report")
    product_summary_month_date = fields.Boolean(string="Current Month Date")
    order_summary_no_of_copies = fields.Integer(string="No. of Copy Receipt", default=1)
    order_summary_current_month = fields.Boolean(string="Current month")
    order_summary_signature = fields.Boolean(string="Signature")
    signature = fields.Boolean(string="Signature")
    no_of_copy_receipt = fields.Integer(string="No.of Copy Receipt", default=1)
    reserve_stock_location_id = fields.Many2one('stock.location', 'Reserve Stock Location')
    stock_location_id = fields.Many2one('stock.location', 'Stock Location')
    product_expiry_report = fields.Boolean(string="Product Expiry Dashboard")
    current_month_date = fields.Boolean(string="Current Month Date")
    pos_dashboard = fields.Boolean(string="Dashboard")
    z_report = fields.Boolean(string="Z Report")
    prod_for_credit_payment = fields.Many2one('product.product', string='Paid Amount Product',
                                              help="This is a dummy product used when a customer pays partially. This is a workaround to the fact that Odoo needs to have at least one product on the order to validate the transaction.")


class PosOrder(models.Model):
    _inherit = 'pos.order'

    statement_ids = fields.One2many('account.bank.statement.line', 'pos_statement_id', string="Paiements")

    @api.model
    def graph_date_on_canvas(self, start_date, end_date):
        data = {}
        company_id = self.env['res.users'].browse([self._uid]).company_id.id
        domain = [('company_id', '=', company_id)]
        if start_date:
            domain += [('date_order', '>=', start_date)]
        else:
            domain += [('date_order', '>=', str(fields.Date.today()) + " 00:00:00")]
        if end_date:
            domain += [('date_order', '<=', end_date)]
        else:
            domain += [('date_order', '<=', str(fields.Date.today()) + " 23:59:59")]
        pos_ids = self.search(domain)
        if pos_ids:
            self._cr.execute("""select aj.name, aj.id, sum(amount)
                                from account_bank_statement_line as absl,
                                     account_bank_statement as abs,
                                     account_journal as aj 
                                where absl.statement_id = abs.id
                                      and abs.journal_id = aj.id 
                                     and absl.pos_statement_id IN %s
                                group by aj.name, aj.id """ % "(%s)" % ','.join(map(str, pos_ids.ids)))
            data = self._cr.dictfetchall()
        total = 0.0
        for each in data:
            total += each['sum']
        for each in data:
            each['per'] = (each['sum'] * 100) / total
        return data

    @api.model
    def session_details_on_canvas(self):
        data = {}
        domain_active_session = []
        close_session_list = []
        active_session_list = []
        company_id = self.env['res.users'].browse([self._uid]).company_id.id
        domain = [('company_id', '=', company_id),
                  ('date_order', '>=', fields.Date.today().strftime('%m/%d/%Y') + " 00:00:00"),
                  ('date_order', '<=', fields.Date.today().strftime('%m/%d/%Y') + " 23:59:59")]
        domain_active_session += domain
        domain_active_session += [('state', '=', 'paid')]
        domain += [('state', '=', 'done')]
        active_pos_ids = self.search(domain_active_session)
        posted_pos_ids = self.search(domain)
        if active_pos_ids:
            self._cr.execute("""select aj.name, aj.id, sum(amount),abs.pos_session_id
                                   from account_bank_statement_line as absl,
                                        account_bank_statement as abs,
                                        account_journal as aj 
                                   where absl.statement_id = abs.id
                                         and abs.journal_id = aj.id 
                                        and absl.pos_statement_id IN %s
                                   group by aj.name, abs.pos_session_id, aj.id """ % "(%s)" % ','.join(
                map(str, active_pos_ids.ids)))
            active_session_data = self._cr.dictfetchall()
            session_group = {}
            sort_group = sorted(active_session_data, key=itemgetter('pos_session_id'))
            for key, value in itertools.groupby(sort_group, key=itemgetter('pos_session_id')):
                if key not in session_group:
                    session_group.update({key: [x for x in value]})
                else:
                    session_group[key] = [x for x in value]
            for k, v in session_group.items():
                total_sum = 0
                for each in v:
                    total_sum += float(each['sum'])
                active_session_list.append(
                    {'pos_session_id': self.env['pos.session'].browse(k).read(), 'sum': total_sum})
        if posted_pos_ids:
            self._cr.execute("""select aj.name, aj.id, sum(amount),abs.pos_session_id
                                   from account_bank_statement_line as absl,
                                        account_bank_statement as abs,
                                        account_journal as aj 
                                   where absl.statement_id = abs.id
                                         and abs.journal_id = aj.id 
                                        and absl.pos_statement_id IN %s
                                   group by aj.name, abs.pos_session_id, aj.id """ % "(%s)" % ','.join(
                map(str, posted_pos_ids.ids)))

            posted_session_data = self._cr.dictfetchall()
            session_group = {}
            sort_group = sorted(posted_session_data, key=itemgetter('pos_session_id'))
            for key, value in itertools.groupby(sort_group, key=itemgetter('pos_session_id')):
                if key not in session_group:
                    session_group.update({key: [x for x in value]})
                else:
                    session_group[key] = [x for x in value]
            for k, v in session_group.items():
                total_sum = 0
                for each in v:
                    total_sum += float(each['sum'])
                close_session_list.append(
                    {'pos_session_id': self.env['pos.session'].browse(k).read(), 'sum': total_sum})
        return {'close_session': close_session_list, 'active_session': active_session_list}

    @api.model
    def orders_by_salesperson(self, start_date, end_date):
        data = {}
        company_id = self.env['res.users'].browse([self._uid]).company_id.id
        domain = [('company_id', '=', company_id)]
        if start_date:
            domain += [('date_order', '>=', start_date)]
        else:
            domain += [('date_order', '>=', fields.Date.today().strftime('%m/%d/%Y') + " 00:00:00")]
        if end_date:
            domain += [('date_order', '<=', end_date)]
        else:
            domain += [('date_order', '<=', fields.Date.today().strftime('%m/%d/%Y') + " 23:59:59")]
        pos_ids = self.search(domain)
        if pos_ids:
            order_ids = []
            for pos_id in pos_ids:
                order_ids.append(pos_id.id)
            self._cr.execute("""
                  SELECT po.user_id, count(DISTINCT(po.id)) As total_orders, SUM((psl.qty * psl.price_unit) * (100 - psl.discount) / 100) AS price_total FROM pos_order_line AS psl
                  JOIN pos_order AS po ON (po.id = psl.order_id)
                  where po.id IN %s
                  GROUP BY po.user_id
                  ORDER BY count(DISTINCT(po.id)) DESC;
                  """ % "(%s)" % ','.join(map(str, pos_ids.ids)))
            data = self._cr.dictfetchall()
        return data

    @api.model
    def get_dashboard_data(self):
        company_id = self.env['res.users'].browse([self._uid]).company_id.id
        res_pos_order = {'total_sales': 0, 'total_orders': 0}
        active_sessions = self.env['pos.session'].search([('state', '=', 'opened')]).ids
        closed_sessions = self.env['pos.session'].search(
            [('stop_at', '>=', fields.Date.today().strftime('%m/%d/%Y') + " 00:00:00"),
             ('stop_at', '<=', fields.Date.today().strftime('%m/%d/%Y') + " 23:59:59"),
             ('state', 'in', ['closing_control', 'closed'])]).ids
        res_pos_order['closed_sessions'] = len(closed_sessions)
        res_pos_order['active_sessions'] = len(active_sessions)
        pos_ids = self.search([('company_id', '=', company_id),
                               ('date_order', '>=', fields.Date.today().strftime('%m/%d/%Y') + " 00:00:00"),
                               ('date_order', '<=', fields.Date.today().strftime('%m/%d/%Y') + " 23:59:59"), ])
        if pos_ids:
            total_sales = 0;
            existing_partner_sale = 0
            new_partner_sale = 0
            without_partner_sale = 0
            for pos_id in pos_ids:
                total_sales += pos_id.amount_total
                if pos_id.partner_id:
                    orders = self.search([('partner_id', '=', pos_id.partner_id.id),
                                          ('company_id', '=', company_id),
                                          ('date_order', '>=', fields.Date.today().strftime('%m/%d/%Y') + " 00:00:00"),
                                          ('date_order', '<=',
                                           fields.Date.today().strftime('%m/%d/%Y') + " 23:59:59"), ])
                    if orders and len(orders) > 1:
                        existing_partner_sale += pos_id.amount_total
                    else:
                        new_partner_sale += pos_id.amount_total
                else:
                    orders = self.search([('partner_id', '=', False),
                                          ('company_id', '=', company_id),
                                          ('date_order', '>=', fields.Date.today().strftime('%m/%d/%Y') + " 00:00:00"),
                                          ('date_order', '<=', fields.Date.today().strftime('%m/%d/%Y') + " 23:59:59")])

                    if orders and len(orders) > 1:
                        without_partner_sale += pos_id.amount_total
            res_pos_order['client_based_sale'] = {'new_client_sale': new_partner_sale,
                                                  'existing_client_sale': existing_partner_sale,
                                                  'without_client_sale': without_partner_sale}
            res_pos_order['total_sales'] = total_sales
            res_pos_order['total_orders'] = len(pos_ids)
            current_time_zone = self.env.user.tz or 'UTC'
            #             orders = []
            if self.env.user.tz:
                tz = pytz.timezone(self.env.user.tz)
            else:
                tz = pytz.utc
            c_time = datetime.now(tz)
            hour_tz = int(str(c_time)[-5:][:2])
            min_tz = int(str(c_time)[-5:][3:])
            sign = str(c_time)[-6][:1]
            sdate = c_time.strftime("%Y-%m-%d 00:00:00")
            edate = c_time.strftime("%Y-%m-%d 23:59:59")
            if sign == '-':
                start_date = (datetime.strptime(sdate, '%Y-%m-%d %H:%M:%S') + timedelta(hours=hour_tz,
                                                                                        minutes=min_tz)).strftime(
                    "%Y-%m-%d %H:%M:%S")
                end_date = (datetime.strptime(edate, '%Y-%m-%d %H:%M:%S') + timedelta(hours=hour_tz,
                                                                                      minutes=min_tz)).strftime(
                    "%Y-%m-%d %H:%M:%S")
            if sign == '+':
                start_date = (datetime.strptime(sdate, '%Y-%m-%d %H:%M:%S') - timedelta(hours=hour_tz,
                                                                                        minutes=min_tz)).strftime(
                    "%Y-%m-%d %H:%M:%S")
                end_date = (datetime.strptime(edate, '%Y-%m-%d %H:%M:%S') - timedelta(hours=hour_tz,
                                                                                      minutes=min_tz)).strftime(
                    "%Y-%m-%d %H:%M:%S")
            self._cr.execute("""SELECT extract(hour from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s') AS date_order_hour,
                                           SUM((pol.qty * pol.price_unit) * (100 - pol.discount) / 100) AS price_total
                                FROM pos_order_line AS pol
                                LEFT JOIN pos_order po ON (po.id=pol.order_id)
                                WHERE po.date_order >= '%s'
                                  AND po.date_order <= '%s'
                                GROUP BY  extract(hour from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s');
                                """ % (current_time_zone, start_date, end_date, current_time_zone))
            result_data_hour = self._cr.dictfetchall()
            hour_lst = [hrs for hrs in range(0, 24)]
            for each in result_data_hour:
                if each['date_order_hour'] != 23:
                    each['date_order_hour'] = [each['date_order_hour'], each['date_order_hour'] + 1]
                else:
                    each['date_order_hour'] = [each['date_order_hour'], 0]
                hour_lst.remove(int(each['date_order_hour'][0]))
            for hrs in hour_lst:
                hr = []
                if hrs != 23:
                    hr += [hrs, hrs + 1]
                else:
                    hr += [hrs, 0]
                result_data_hour.append({'date_order_hour': hr, 'price_total': 0.0})
            sorted_hour_data = sorted(result_data_hour, key=lambda l: l['date_order_hour'][0])
            res_pos_order['sales_based_on_hours'] = sorted_hour_data
            # this month data
        res_curr_month = self.pos_order_month_based(1)
        res_pos_order['current_month'] = res_curr_month
        #             Last 6 month data
        last_6_month_res = self.pos_order_month_based(12)
        res_pos_order['last_6_month_res'] = last_6_month_res
        return res_pos_order

    def pos_order_month_based(self, month_count):
        tz = pytz.utc
        c_time = datetime.now(tz)
        hour_tz = int(str(c_time)[-5:][:2])
        min_tz = int(str(c_time)[-5:][3:])
        sign = str(c_time)[-6][:1]
        current_time_zone = self.env.user.tz or 'UTC'
        stdate = c_time.strftime("%Y-%m-01 00:00:00")
        eddate = (c_time + relativedelta(day=1, months=+month_count, days=-1)).strftime("%Y-%m-%d 23:59:59")
        # this month data
        if sign == '-':
            mon_stdate = (datetime.strptime(stdate, '%Y-%m-%d %H:%M:%S') + timedelta(hours=hour_tz,
                                                                                     minutes=min_tz)).strftime(
                "%Y-%m-%d %H:%M:%S")
            mon_eddate = (datetime.strptime(eddate, '%Y-%m-%d %H:%M:%S') + timedelta(hours=hour_tz,
                                                                                     minutes=min_tz)).strftime(
                "%Y-%m-%d %H:%M:%S")
        if sign == '+':
            mon_stdate = (datetime.strptime(stdate, '%Y-%m-%d %H:%M:%S') - timedelta(hours=hour_tz,
                                                                                     minutes=min_tz)).strftime(
                "%Y-%m-%d %H:%M:%S")
            mon_eddate = (datetime.strptime(eddate, '%Y-%m-%d %H:%M:%S') - timedelta(hours=hour_tz,
                                                                                     minutes=min_tz)).strftime(
                "%Y-%m-%d %H:%M:%S")
        if month_count == 12:
            self._cr.execute("""SELECT extract(month from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s') AS date_order_month,
                                       SUM((pol.qty * pol.price_unit) * (100 - pol.discount) / 100) AS price_total
                            FROM pos_order_line AS pol
                            LEFT JOIN pos_order po ON (po.id=pol.order_id)
                            WHERE po.date_order >= '%s'
                              AND po.date_order <= '%s'
                            GROUP BY extract(month from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s');
                            """ % (current_time_zone, mon_stdate, mon_eddate, current_time_zone))
        else:
            self._cr.execute("""SELECT extract(day from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s') AS date_order_day,
                                            extract(month from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s') AS date_order_month,
                                           SUM((pol.qty * pol.price_unit) * (100 - pol.discount) / 100) AS price_total
                                FROM pos_order_line AS pol
                                LEFT JOIN pos_order po ON (po.id=pol.order_id)
                                WHERE po.date_order >= '%s'
                                  AND po.date_order <= '%s'
                                GROUP BY  extract(day from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s'),
                                    extract(month from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s')
                                    ORDER BY extract(day from po.date_order AT TIME ZONE 'UTC' AT TIME ZONE '%s') DESC;
                                """ % (
                current_time_zone, current_time_zone, mon_stdate, mon_eddate, current_time_zone, current_time_zone,
                current_time_zone))
        result_this_month = self._cr.dictfetchall()
        return result_this_month

    @api.model
    def graph_best_product(self, start_date, end_date):
        data = {}
        company_id = self.env['res.users'].browse([self._uid]).company_id.id
        domain = [('company_id', '=', company_id)]
        if start_date:
            domain += [('date_order', '>=', start_date)]
        else:
            domain += [('date_order', '>=', fields.Date.today().strftime('%m/%d/%Y') + " 00:00:00")]
        if end_date:
            domain += [('date_order', '<=', end_date)]
        else:
            domain += [('date_order', '<=', fields.Date.today().strftime('%m/%d/%Y') + " 23:59:59")]
        pos_ids = self.search(domain)
        if pos_ids:
            order_ids = []
            for pos_id in pos_ids:
                order_ids.append(pos_id.id)
            self._cr.execute("""
                SELECT pt.name, sum(psl.qty), SUM((psl.qty * psl.price_unit) * (100 - psl.discount) / 100) AS price_total FROM pos_order_line AS psl
                JOIN pos_order AS po ON (po.id = psl.order_id)
                JOIN product_product AS pp ON (psl.product_id = pp.id)
                JOIN product_template AS pt ON (pt.id = pp.product_tmpl_id)
                where po.id IN %s
                GROUP BY pt.name
                ORDER BY sum(psl.qty) DESC limit 50;
                """ % "(%s)" % ','.join(map(str, pos_ids.ids)))
            data = self._cr.dictfetchall()
        return data

    @api.model
    def graph_data(self, from_date, to_date, category, limit, session_id, current_session_report):
        if from_date and not to_date:
            if from_date.split(' ')[0] and len(from_date.split(' ')) > 1:
                to_date = from_date.split(' ')[0] + " 23:59:59"
        elif to_date and not from_date:
            if to_date.split(' ')[0] and len(to_date.split(' ')) > 1:
                from_date = to_date.split(' ')[0] + " 00:00:00"
        try:
            if from_date and to_date:
                if category == 'top_customer':
                    if current_session_report:
                        order_ids = self.env['pos.order'].search([('partner_id', '!=', False),
                                                                  ('date_order', '>=', from_date),
                                                                  ('date_order', '<=', to_date),
                                                                  ('session_id', '=', session_id)],
                                                                 order='date_order desc')
                    else:
                        order_ids = self.env['pos.order'].search([('partner_id', '!=', False),
                                                                  ('date_order', '>=', from_date),
                                                                  ('date_order', '<=', to_date)],
                                                                 order='date_order desc')
                    result = []
                    record = {}
                    if order_ids:
                        for each_order in order_ids:
                            if each_order.partner_id in record:
                                record.update({each_order.partner_id: record.get(
                                    each_order.partner_id) + each_order.amount_total})
                            else:
                                record.update({each_order.partner_id: each_order.amount_total})
                    if record:
                        result = [(k.name, v) for k, v in record.items()]
                        result = sorted(result, key=lambda x: x[1], reverse=True)
                    if limit == 'ALL':
                        return result
                    return result[:int(limit)]
                if category == 'top_products':
                    if current_session_report:
                        self._cr.execute("""
                               SELECT pt.name, sum(psl.qty), pp.id FROM pos_order_line AS psl
                               JOIN pos_order AS po ON (po.id = psl.order_id)
                               JOIN product_product AS pp ON (psl.product_id = pp.id)
                               JOIN product_template AS pt ON (pt.id = pp.product_tmpl_id)
                               WHERE po.date_order >= '%s'
                               AND po.date_order <= '%s'
                               AND po.session_id = '%s'
                               GROUP BY pt.name, pp.id
                               ORDER BY sum(psl.qty) DESC limit %s;
                               """ % ((from_date, to_date, session_id, limit)))
                        return self._cr.fetchall()
                    else:
                        self._cr.execute("""
                               SELECT pt.name, sum(psl.qty), pp.id FROM pos_order_line AS psl
                               JOIN pos_order AS po ON (po.id = psl.order_id)
                               JOIN product_product AS pp ON (psl.product_id = pp.id)
                               JOIN product_template AS pt ON (pt.id = pp.product_tmpl_id)
                               WHERE po.date_order >= '%s'
                               AND po.date_order <= '%s'
                               GROUP BY pt.name, pp.id
                               ORDER BY sum(psl.qty) DESC limit %s;
                               """ % ((from_date, to_date, limit)))
                        return self._cr.fetchall()
                if category == 'cashiers':
                    if current_session_report:
                        self._cr.execute("""
                               SELECT pc.name, SUM(absl.amount) FROM account_bank_statement_line absl
                               JOIN account_journal aj ON absl.journal_id = aj.id
                               JOIN pos_session as ps ON ps.name = absl.ref
                               JOIN pos_config as pc ON pc.id = ps.config_id
                               WHERE absl.create_date >= '%s' AND absl.create_date <= '%s'
                               AND ps.id = '%s'
                               GROUP BY pc.name
                               limit %s
                               """ % ((from_date, to_date, session_id, limit)))
                        return self._cr.fetchall()
                    else:
                        SQL1 = """SELECT pc.name,sum(abs.balance_end) from 
                                   pos_session ps,account_bank_statement abs,pos_config pc
                                   WHERE abs.pos_session_id = ps.id 
                                   AND pc.id = ps.config_id
                                   AND ps.start_at AT TIME ZONE 'GMT' >= '%s' 
                                   and ps.start_at  AT TIME ZONE 'GMT' <= '%s'
                                   GROUP BY pc.name;
                                   """ % ((from_date, to_date))
                        self._cr.execute(SQL1)
                        find_session = self._cr.fetchall()
                        return find_session
                if category == 'sales_by_location':
                    if current_session_report:
                        self._cr.execute("""
                               SELECT (loc1.name || '/' || loc.name) as name, sum(psl.price_unit) FROM pos_order_line AS psl
                               JOIN pos_order AS po ON (po.id = psl.order_id)
                               JOIN stock_location AS loc ON (loc.id = po.location_id)
                               JOIN stock_location AS loc1 ON (loc.location_id = loc1.id)
                               WHERE po.date_order >= '%s'
                               AND po.date_order <= '%s'
                               AND po.session_id = '%s'
                               GROUP BY loc.name, loc1.name
                               limit %s
                               """ % ((from_date, to_date, session_id, limit)))
                        return self._cr.fetchall()
                    else:
                        self._cr.execute("""
                               SELECT (loc1.name || '/' || loc.name) as name, sum(psl.price_unit) FROM pos_order_line AS psl
                               JOIN pos_order AS po ON (po.id = psl.order_id)
                               JOIN stock_location AS loc ON (loc.id = po.location_id)
                               JOIN stock_location AS loc1 ON (loc.location_id = loc1.id)
                               WHERE po.date_order >= '%s'
                               AND po.date_order <= '%s'
                               GROUP BY loc.name, loc1.name
                               limit %s
                               """ % ((from_date, to_date, limit)))
                        return self._cr.fetchall()
                if category == 'income_by_journals':
                    if current_session_report:
                        self._cr.execute("""
                               select aj.name, sum(absl.amount) from account_bank_statement_line absl
                               join account_journal aj on absl.journal_id = aj.id
                               join pos_session as ps on ps.name = absl.ref
                               join pos_config as pc on pc.id = ps.config_id
                               where absl.create_date >= '%s' and absl.create_date <= '%s'
                               and ps.id = '%s'
                               group by aj.name
                               limit %s
                               """ % ((from_date, to_date, session_id, limit)))
                        return self._cr.fetchall()
                    else:
                        self._cr.execute("""
                           select aj.name, sum(absl.amount) from account_bank_statement_line absl
                           join account_journal aj on absl.journal_id = aj.id
                           join pos_session as ps on ps.name = absl.ref
                           join pos_config as pc on pc.id = ps.config_id
                           where absl.create_date >= '%s' and absl.create_date <= '%s'
                           group by aj.name
                           limit %s
                           """ % ((from_date, to_date, limit)))
                    return self._cr.fetchall()
                if category == 'top_category':
                    if current_session_report:
                        self._cr.execute("""
                               SELECT pc.name, sum((pol.price_unit * pol.qty) - pol.discount) 
                               FROM pos_category pc
                               join product_template pt on pc.id = pt.pos_categ_id
                               join product_product pp on pt.id = pp.product_tmpl_id
                               join pos_order_line pol on pp.id = pol.product_id
                               join pos_order po on pol.order_id = po.id
                               where pol.create_date >= '%s' and pol.create_date <= '%s'
                               and po.session_id = '%s'
                               group by pc.name
                               ORDER BY sum(pol.price_unit) DESC
                               limit %s
                               """ % ((from_date, to_date, session_id, limit)))
                        return self._cr.fetchall()
                    else:
                        self._cr.execute("""
                               SELECT pc.name, sum((pol.price_unit * pol.qty) - pol.discount) 
                               FROM pos_category pc
                               join product_template pt on pc.id = pt.pos_categ_id
                               join product_product pp on pt.id = pp.product_tmpl_id
                               join pos_order_line pol on pp.id = pol.product_id
                               join pos_order po on pol.order_id = po.id
                               where pol.create_date >= '%s' and pol.create_date <= '%s'
                               group by pc.name
                               ORDER BY sum(pol.price_unit) DESC
                               limit %s
                               """ % ((from_date, to_date, limit)))
                        return self._cr.fetchall()
                if category == 'pos_benifit':
                    domain = False
                    if current_session_report:
                        domain = [('date_order', '>=', from_date),
                                  ('date_order', '<=', to_date),
                                  ('session_id', '=', session_id)]
                    else:
                        domain = [('date_order', '>=', from_date),
                                  ('date_order', '<=', to_date)]
                    if domain and len(domain) > 1:
                        order_ids = self.env['pos.order'].search(domain, order='date_order desc')
                        if len(order_ids) > 0:
                            profit_amount = 0
                            loss_amount = 0
                            loss = 0
                            profit = 0
                            for order in order_ids:
                                for line in order.lines:
                                    cost_price = line.product_id.standard_price * line.qty
                                    # sale_price = line.price_subtotal_incl
                                    sale_price = line.price_subtotal
                                    profit_amount += (sale_price - cost_price)
                                    loss_amount += (cost_price - sale_price)
                            if loss_amount > 0:
                                loss = loss_amount
                            if profit_amount > 0:
                                profit = profit_amount
                            return [('Profit', profit), ('Loss', loss)]
                    return False
        except Exception as e:
            return {'error': e}

    @api.model
    def order_summary_report(self, vals):
        order_list = {}
        order_list_sorted = []
        category_list = {}
        payment_list = {}
        if (vals):
            if (vals['state'] == ''):
                if ('order_summary_report' in vals['summary'] or len(vals['summary']) == 0):
                    orders = self.search(
                        [('date_order', '>=', vals.get('start_date')), ('date_order', '<=', vals.get('end_date'))])
                    for each_order in orders:
                        order_list[each_order.state] = []
                    for each_order in orders:
                        if each_order.state in order_list:
                            order_list[each_order.state].append({
                                'order_ref': each_order.name,
                                'order_date': each_order.date_order,
                                'total': float(format(each_order.amount_total, '.2f'))
                            })
                        else:
                            order_list.update({
                                each_order.state.append({
                                    'order_ref': each_order.name,
                                    'order_date': each_order.date_order,
                                    'total': float(format(each_order.amount_total, '.2f'))
                                })
                            })
                if ('category_summary_report' in vals['summary'] or len(vals['summary']) == 0):
                    count = 0.00
                    amount = 0.00
                    orders = self.search(
                        [('date_order', '>=', vals.get('start_date')), ('date_order', '<=', vals.get('end_date'))])
                    for each_order in orders:
                        category_list[each_order.state] = {}
                    for each_order in orders:
                        for order_line in each_order.lines:
                            if each_order.state == 'paid':
                                if order_line.product_id.pos_categ_id.name in category_list[each_order.state]:
                                    count = category_list[each_order.state][order_line.product_id.pos_categ_id.name][0]
                                    amount = category_list[each_order.state][order_line.product_id.pos_categ_id.name][1]
                                    count += order_line.qty
                                    amount += order_line.price_subtotal_incl
                                else:
                                    count = order_line.qty
                                    amount = order_line.price_subtotal_incl
                            if each_order.state == 'done':
                                if order_line.product_id.pos_categ_id.name in category_list[each_order.state]:
                                    count = category_list[each_order.state][order_line.product_id.pos_categ_id.name][0]
                                    amount = category_list[each_order.state][order_line.product_id.pos_categ_id.name][1]
                                    count += order_line.qty
                                    amount += order_line.price_subtotal_incl
                                else:
                                    count = order_line.qty
                                    amount = order_line.price_subtotal_incl
                            if each_order.state == 'invoiced':
                                if order_line.product_id.pos_categ_id.name in category_list[each_order.state]:
                                    count = category_list[each_order.state][order_line.product_id.pos_categ_id.name][0]
                                    amount = category_list[each_order.state][order_line.product_id.pos_categ_id.name][1]
                                    count += order_line.qty
                                    amount += order_line.price_subtotal_incl
                                else:
                                    count = order_line.qty
                                    amount = order_line.price_subtotal_incl
                            category_list[each_order.state].update(
                                {order_line.product_id.pos_categ_id.name: [count, amount]})
                        if (False in category_list[each_order.state]):
                            category_list[each_order.state]['others'] = category_list[each_order.state].pop(False)

                if ('payment_summary_report' in vals['summary'] or len(vals['summary']) == 0):
                    count = 0
                    orders = self.search(
                        [('date_order', '>=', vals.get('start_date')), ('date_order', '<=', vals.get('end_date'))])
                    for each_order in orders:
                        payment_list[each_order.state] = {}
                    for each_order in orders:
                        for payment_line in each_order.statement_ids:
                            if each_order.state == 'paid':
                                if payment_line.journal_id.name in payment_list[each_order.state]:
                                    count = payment_list[each_order.state][payment_line.journal_id.name]
                                    count += payment_line.amount
                                else:
                                    count = payment_line.amount
                            if each_order.state == 'done':
                                if payment_line.journal_id.name in payment_list[each_order.state]:
                                    count = payment_list[each_order.state][payment_line.journal_id.name]
                                    count += payment_line.amount
                                else:
                                    count = payment_line.amount
                            if each_order.state == 'invoiced':
                                if payment_line.journal_id.name in payment_list[each_order.state]:
                                    count = payment_list[each_order.state][payment_line.journal_id.name]
                                    count += payment_line.amount
                                else:
                                    count = payment_line.amount
                            payment_list[each_order.state].update(
                                {payment_line.journal_id.name: float(format(count, '.2f'))})
                return {'order_report': order_list, 'category_report': category_list, 'payment_report': payment_list,
                        'state': vals['state']}
            else:
                order_list = []
                if ('order_summary_report' in vals['summary'] or len(vals['summary']) == 0):
                    orders = self.search(
                        [('date_order', '>=', vals.get('start_date')), ('date_order', '<=', vals.get('end_date')),
                         ('state', '=', vals.get('state'))])
                    for each_order in orders:
                        order_list.append({
                            'order_ref': each_order.name,
                            'order_date': each_order.date_order,
                            'total': float(format(each_order.amount_total, '.2f'))
                        })
                    order_list_sorted = sorted(order_list, key=itemgetter('order_ref'))

                if ('category_summary_report' in vals['summary'] or len(vals['summary']) == 0):
                    count = 0.00
                    amount = 0.00
                    values = []
                    orders = self.search(
                        [('date_order', '>=', vals.get('start_date')), ('date_order', '<=', vals.get('end_date')),
                         ('state', '=', vals.get('state'))])
                    for each_order in orders:
                        for order_line in each_order.lines:
                            if order_line.product_id.pos_categ_id.name in category_list:
                                count = category_list[order_line.product_id.pos_categ_id.name][0]
                                amount = category_list[order_line.product_id.pos_categ_id.name][1]
                                count += order_line.qty
                                amount += order_line.price_subtotal_incl
                            else:
                                count = order_line.qty
                                amount = order_line.price_subtotal_incl
                            category_list.update({order_line.product_id.pos_categ_id.name: [count, amount]})
                    if (False in category_list):
                        category_list['others'] = category_list.pop(False)
                if ('payment_summary_report' in vals['summary'] or len(vals['summary']) == 0):
                    count = 0
                    orders = self.search(
                        [('date_order', '>=', vals.get('start_date')), ('date_order', '<=', vals.get('end_date')),
                         ('state', '=', vals.get('state'))])
                    for each_order in orders:
                        for payment_line in each_order.statement_ids:
                            if payment_line.journal_id.name in payment_list:
                                count = payment_list[payment_line.journal_id.name]
                                count += payment_line.amount
                            else:
                                count = payment_line.amount
                            payment_list.update({payment_line.journal_id.name: float(format(count, '.2f'))})
            return {
                'order_report': order_list_sorted,
                'category_report': category_list,
                'payment_report': payment_list,
                'state': vals['state']
            }

    @api.model
    def payment_summary_report(self, vals):
        journals_detail = {}
        salesmen_detail = {}
        summary_data = {}
        if vals:
            order_detail = self.env['pos.order'].search([('date_order', '>=', vals.get('start_date')),
                                                         ('date_order', '<=', vals.get('end_date'))
                                                         ])
            print("===========>", order_detail, "<=================")
            if 'journals' in vals.get('summary'):
                if order_detail:
                    for each_order in order_detail:
                        order_date = each_order.date_order
                        # date1 = datetime.strptime(order_date, '%Y-%m-%d  %H:%M:%S')
                        print("statements", each_order.statement_ids)
                        print('staements 2', self.env['account.bank.statement.line'].search(
                            [('pos_statement_id', '=', each_order.id)]))
                        date1 = order_date
                        month_year = date1.strftime("%B-%Y")
                        if not month_year in journals_detail:
                            journals_detail[month_year] = {}
                            for payment_line in each_order.statement_ids:
                                print(payment_line.statement_id.journal_id)
                                if payment_line.statement_id.journal_id.name in journals_detail[month_year]:
                                    payment = journals_detail[month_year][payment_line.statement_id.journal_id.name]
                                    payment += payment_line.amount
                                else:
                                    payment = payment_line.amount
                                journals_detail[month_year][payment_line.statement_id.journal_id.name] = float(
                                    format(payment, '2f'))

                                print('==>', journals_detail[month_year][payment_line.statement_id.journal_id.name])

                            # print()
                        else:
                            for payment_line in each_order.statement_ids:
                                if payment_line.statement_id.journal_id.name in journals_detail[month_year]:
                                    payment = journals_detail[month_year][payment_line.statement_id.journal_id.name]
                                    payment += payment_line.amount
                                else:
                                    payment = payment_line.amount
                                journals_detail[month_year][payment_line.statement_id.journal_id.name] = float(
                                    format(payment, '2f'))
                    for journal in journals_detail.values():
                        for i in journal:
                            if i in summary_data:
                                total = journal[i] + summary_data[i]
                            else:
                                total = journal[i]
                            summary_data[i] = float(format(total, '2f'))
                    print("Sumarry datat", summary_data)

            if 'sales_person' in vals.get('summary'):
                if order_detail:
                    for each_order in order_detail:
                        order_date = each_order.date_order
                        # date1 = datetime.strptime(order_date, '%Y-%m-%d  %H:%M:%S')
                        date1 = order_date
                        month_year = date1.strftime("%B-%Y")
                        print("statements", each_order.statement_ids)
                        if each_order.user_id.name not in salesmen_detail:
                            salesmen_detail[each_order.user_id.name] = {}
                            if not month_year in salesmen_detail[each_order.user_id.name]:
                                salesmen_detail[each_order.user_id.name][month_year] = {}

                                for payment_line in each_order.statement_ids:
                                    if payment_line.statement_id.journal_id.name in \
                                            salesmen_detail[each_order.user_id.name][month_year]:
                                        payment = salesmen_detail[each_order.user_id.name][month_year][
                                            payment_line.statement_id.journal_id.name]
                                        payment += payment_line.amount
                                    else:
                                        payment = payment_line.amount
                                    salesmen_detail[each_order.user_id.name][month_year][
                                        payment_line.statement_id.journal_id.name] = float(
                                        format(payment, '2f'));
                        else:
                            # print("statements", each_order.statement_ids)
                            if not month_year in salesmen_detail[each_order.user_id.name]:
                                salesmen_detail[each_order.user_id.name][month_year] = {}
                                for payment_line in each_order.statement_ids:
                                    if payment_line.statement_id.journal_id.name in \
                                            salesmen_detail[each_order.user_id.name][month_year]:
                                        payment = salesmen_detail[each_order.user_id.name][month_year][
                                            payment_line.statement_id.journal_id.name]
                                        payment += payment_line.amount
                                    else:
                                        payment = payment_line.amount
                                    salesmen_detail[each_order.user_id.name][month_year][
                                        payment_line.statement_id.journal_id.name] = float(
                                        format(payment, '2f'));
                            else:
                                for payment_line in each_order.statement_ids:
                                    if payment_line.statement_id.journal_id.name in \
                                            salesmen_detail[each_order.user_id.name][month_year]:
                                        payment = salesmen_detail[each_order.user_id.name][month_year][
                                            payment_line.statement_id.journal_id.name]
                                        payment += payment_line.amount
                                    else:
                                        payment = payment_line.amount
                                    salesmen_detail[each_order.user_id.name][month_year][
                                        payment_line.statement_id.journal_id.name] = float(
                                        format(payment, '2f'))

        print("===> journal details", journals_detail)
        print("===> salesmen details", salesmen_detail)
        print("===> summary data", summary_data)

        return {
            'journal_details': journals_detail,
            'salesmen_details': salesmen_detail,
            'summary_data': summary_data
        }

    @api.model
    def product_summary_report(self, vals):
        product_summary_dict = {}
        category_summary_dict = {}
        payment_summary_dict = {}
        location_summary_dict = {}
        product_qty = 0
        location_qty = 0
        category_qty = 0
        payment = 0
        if vals:
            order_detail = self.env['pos.order'].search([('date_order', '>=', vals.get('start_date')),
                                                         ('date_order', '<=', vals.get('end_date'))
                                                         ])
            if ('product_summary' in vals.get('summary')) or (len(vals.get('summary')) == 0):
                if order_detail:
                    for each_order in order_detail:
                        for each_order_line in each_order.lines:
                            if each_order_line.product_id.name in product_summary_dict:
                                product_qty = product_summary_dict[each_order_line.product_id.name]
                                product_qty += each_order_line.qty
                            else:
                                product_qty = each_order_line.qty
                            product_summary_dict[each_order_line.product_id.name] = product_qty

            if ('category_summary' in vals.get('summary')) or (len(vals.get('summary')) == 0):
                if order_detail:
                    for each_order in order_detail:
                        for each_order_line in each_order.lines:
                            if each_order_line.product_id.pos_categ_id.name in category_summary_dict:
                                category_qty = category_summary_dict[each_order_line.product_id.pos_categ_id.name]
                                category_qty += each_order_line.qty
                            else:
                                category_qty = each_order_line.qty
                            category_summary_dict[each_order_line.product_id.pos_categ_id.name] = category_qty
                    if False in category_summary_dict:
                        category_summary_dict['Others'] = category_summary_dict.pop(False)

            if ('payment_summary' in vals.get('summary')) or (len(vals.get('summary')) == 0):
                if order_detail:
                    for each_order in order_detail:
                        for payment_line in each_order.statement_ids:
                            if payment_line.statement_id.journal_id.name in payment_summary_dict:
                                payment = payment_summary_dict[payment_line.statement_id.journal_id.name]
                                payment += payment_line.amount
                            else:
                                payment = payment_line.amount
                            payment_summary_dict[payment_line.statement_id.journal_id.name] = float(
                                format(payment, '2f'))

            if ('location_summary' in vals.get('summary')) or (len(vals.get('summary')) == 0):
                location_list = []
                for each_order in order_detail:
                    location_summary_dict[each_order.picking_id.location_id.name] = {}
                for each_order in order_detail:
                    for each_order_line in each_order.lines:
                        if each_order_line.product_id.name in location_summary_dict[each_order.picking_id.location_id.name]:
                            location_qty = location_summary_dict[each_order.picking_id.location_id.name][
                                each_order_line.product_id.name]
                            location_qty += each_order_line.qty
                        else:
                            location_qty = each_order_line.qty
                        location_summary_dict[each_order.picking_id.location_id.name][
                            each_order_line.product_id.name] = location_qty
                location_list.append(location_summary_dict)

        print({
            'product_summary': product_summary_dict,
            'category_summary': category_summary_dict,
            'payment_summary': payment_summary_dict,
            'location_summary': location_summary_dict,
        })

        return {
            'product_summary': product_summary_dict,
            'category_summary': category_summary_dict,
            'payment_summary': payment_summary_dict,
            'location_summary': location_summary_dict,
        }


class pos_session(models.Model):
    _inherit = 'pos.session'

    def get_inventory_details(self):
        product_category = self.env['product.category'].search([])
        product_product = self.env['product.product']
        stock_location = self.config_id.stock_location_id;
        inventory_records = []
        final_list = []
        product_details = []
        if self and self.id:
            for order in self.order_ids:
                for line in order.lines:
                    product_details.append({
                        'id': line.product_id.id,
                        'qty': line.qty,
                    })
        custom_list = []
        for each_prod in product_details:
            if each_prod.get('id') not in [x.get('id') for x in custom_list]:
                custom_list.append(each_prod)
            else:
                for each in custom_list:
                    if each.get('id') == each_prod.get('id'):
                        each.update({'qty': each.get('qty') + each_prod.get('qty')})
        for each in custom_list:
            product_id = product_product.browse(each.get('id'))
            if product_id:
                inventory_records.append({
                    'product_id': [product_id.id, product_id.name],
                    'category_id': [product_id.id, product_id.categ_id.name],
                    'used_qty': each.get('qty'),
                    'quantity': product_id.with_context(
                        {'location': stock_location.id, 'compute_child': False}).qty_available,
                    'uom_name': product_id.uom_id.name or ''
                })
            if inventory_records:
                temp_list = []
                temp_obj = []
                for each in inventory_records:
                    if each.get('product_id')[0] not in temp_list:
                        temp_list.append(each.get('product_id')[0])
                        temp_obj.append(each)
                    else:
                        for rec in temp_obj:
                            if rec.get('product_id')[0] == each.get('product_id')[0]:
                                qty = rec.get('quantity') + each.get('quantity')
                                rec.update({'quantity': qty})
                final_list = sorted(temp_obj, key=lambda k: k['quantity'])
        return final_list or []

    @api.model
    def search(self, args, offset=0, limit=None, order=None, count=False):
        user_rec = self.env['res.users'].browse(self._uid)
        erp_manager_id = self.env['ir.model.data'].get_object_reference('base',
                                                                        'group_erp_manager')[1]
        if user_rec and erp_manager_id not in user_rec.groups_id.ids:
            if user_rec.shop_ids:
                args += ['|', ('shop_id', 'in', user_rec.shop_ids.ids), ('shop_id', '=', False)]
            res = super(pos_session, self).search(args=args, offset=offset, limit=limit, order=order, count=count)
        else:
            res = super(pos_session, self).search(args=args, offset=offset, limit=limit, order=order, count=count)
        return res

    def get_products_category_data(self, flag_config):
        product_list = []
        category_list = []
        if self.shop_id and self.shop_id.location_id.product_ids:
            for product in self.shop_id.location_id.product_ids:
                product_list.append(product.id)
        if self.shop_id and self.shop_id.location_id.category_ids:
            for cat in self.shop_id.location_id.category_ids:
                category_list.append(cat.id)
        dummy_products = self.env['product.product'].sudo().with_context(
            {'location': self.config_id.stock_location_id.id}).search([('is_dummy_product', '=', True)]).ids
        if flag_config == False:
            domain = ['|', ('is_dummy_product', '=', True), ('sale_ok', '=', True), ('available_in_pos', '=', True)]
        else:
            domain = ['|', '|', ('is_dummy_product', '=', True), ('id', 'in', product_list),
                      ('pos_categ_id', 'in', category_list), ('sale_ok', '=', True), ('available_in_pos', '=', True)]
        product_records = self.env['product.product'].sudo().with_context(
            {'location': self.config_id.stock_location_id.id}).search(domain).ids
        if not product_records or len(dummy_products) >= len(product_records):
            domain = [('sale_ok', '=', True), ('available_in_pos', '=', True)]
            product_records = self.env['product.product'].sudo().with_context(
                {'location': self.config_id.stock_location_id.id}).search(domain).ids
        return product_records

    def get_pos_name(self):
        if self and self.config_id:
            return self.config_id.name

    # def custom_close_pos_session(self):
    #     self._check_pos_session_balance()
    #     for session in self:
    #         session.write({'state': 'closing_control', 'stop_at': fields.Datetime.now()})
    #         if not session.config_id.cash_control:
    #             return session.action_pos_session_close()
    #         if session.config_id.cash_control:
    #             self._check_pos_session_balance()
    #             return self.action_pos_session_close()

    # def close_open_balance(self):
    #     self.write({'opening_balance': False})
    #     return True
    #
    # def cash_control_line(self, vals):
    #     total_amount = 0.00
    #     if vals:
    #         self.cashcontrol_ids.unlink()
    #         for data in vals:
    #             self.env['custom.cashcontrol'].create(data)
    #     for cash_line in self.cashcontrol_ids:
    #         total_amount += cash_line.subtotal
    #     for statement in self.statement_ids:
    #         statement.write({'balance_end_real': total_amount})
    #     return True
    #
    # def open_balance(self, vals):
    #     cash_journal = []
    #     for statement in self.statement_ids:
    #         if statement.journal_id.type == 'cash':
    #             cash_journal.append(statement)
    #     if len(cash_journal) > 0:
    #         cash_journal[0].write({'balance_start': vals})
    #     self.write({'opening_balance': False})
    #     return True

    def _confirm_orders(self):
        for session in self:
            company_id = session.config_id.journal_id.company_id.id
            orders = session.order_ids.filtered(lambda order: order.state == 'paid')
            journal_id = self.env['ir.config_parameter'].sudo().get_param(
                'pos.closing.journal_id_%s' % company_id, default=session.config_id.journal_id.id)

            move = self.env['pos.order'].with_context(force_company=company_id)._create_account_move(session.start_at,
                                                                                                     session.name,
                                                                                                     int(journal_id),
                                                                                                     company_id)
            orders.with_context(force_company=company_id)._create_account_move_line(session, move)
            for order in session.order_ids.filtered(lambda o: o.state not in ['done', 'invoiced']):
                if order.state not in ('draft'):
                    # raise UserError(_("You cannot confirm all orders of this session, because they have not the 'paid' status"))
                    order.action_pos_order_done()
            orders_to_reconcile = session.order_ids._filtered_for_reconciliation()
            orders_to_reconcile.sudo()._reconcile_payments()

    def action_pos_session_open(self):
        pos_order = self.env['pos.order'].search([('state', '=', 'draft')])
        for order in pos_order:
            if order.session_id.state != 'opened':
                order.write({'session_id': self.id})
        return super(pos_session, self).action_pos_session_open()

    @api.model
    def get_proxy_ip(self):
        proxy_id = self.env['res.users'].browse([self._uid]).company_id.report_ip_address
        return {'ip': proxy_id or False}

    def get_user(self):
        if self._uid == SUPERUSER_ID:
            return True

    def get_gross_total(self):
        gross_total = 0.0
        if self and self.order_ids:
            for order in self.order_ids:
                for line in order.lines:
                    gross_total += line.qty * (line.price_unit - line.product_id.standard_price)
        return gross_total

    def get_product_cate_total(self):
        balance_end_real = 0.0
        if self and self.order_ids:
            for order in self.order_ids:
                if order.state != "draft":
                    for line in order.lines:
                        balance_end_real += (line.qty * line.price_unit)
        return balance_end_real

    def get_net_gross_total(self):
        net_gross_profit = 0.0
        if self:
            net_gross_profit = self.get_gross_total() - self.get_total_tax()
        return net_gross_profit

    def get_product_name(self, category_id):
        if category_id:
            category_name = self.env['pos.category'].browse([category_id]).name
            return category_name

    def get_payments(self):
        if self:
            statement_line_obj = self.env["account.bank.statement.line"]
            pos_order_obj = self.env["pos.order"]
            company_id = self.env['res.users'].browse([self._uid]).company_id.id
            pos_ids = pos_order_obj.search([('state', 'in', ['paid', 'invoiced', 'done']),
                                            ('company_id', '=', company_id), ('session_id', '=', self.id)])
            data = {}
            if pos_ids:
                pos_ids = [pos.id for pos in pos_ids]
                st_line_ids = statement_line_obj.search([('pos_statement_id', 'in', pos_ids)])
                if st_line_ids:
                    a_l = []
                    for r in st_line_ids:
                        a_l.append(r['id'])
                    self._cr.execute(
                        "select aj.name,sum(amount) from account_bank_statement_line as absl,account_bank_statement as abs,account_journal as aj " \
                        "where absl.statement_id = abs.id and abs.journal_id = aj.id  and absl.id IN %s " \
                        "group by aj.name ", (tuple(a_l),))

                    data = self._cr.dictfetchall()
                    return data
            else:
                return {}

    def get_product_category(self):
        product_list = []
        if self and self.order_ids:
            for order in self.order_ids:
                if order.state != 'draft':
                    for line in order.lines:
                        flag = False
                        product_dict = {}
                        for lst in product_list:
                            if line.product_id.pos_categ_id:
                                if lst.get('pos_categ_id') == line.product_id.pos_categ_id.id:
                                    lst['price'] = lst['price'] + (line.qty * line.price_unit)
                                    flag = True
                            else:
                                if lst.get('pos_categ_id') == '':
                                    lst['price'] = lst['price'] + (line.qty * line.price_unit)
                                    flag = True
                        if not flag:
                            product_dict.update({
                                'pos_categ_id': line.product_id.pos_categ_id and line.product_id.pos_categ_id.id or '',
                                'price': (line.qty * line.price_unit)
                            })
                            product_list.append(product_dict)
        return product_list

    def get_journal_amount(self):
        journal_list = []
        if self and self.statement_ids:
            for statement in self.statement_ids:
                journal_dict = {}
                journal_dict.update({'journal_id': statement.journal_id and statement.journal_id.name or '',
                                     'ending_bal': statement.balance_end_real or 0.0})
                journal_list.append(journal_dict)
        return journal_list

    def get_journal_amount_x(self):
        journal_list = []
        if self and self.statement_ids:
            for statement in self.statement_ids:
                journal_dict = {}
                journal_dict.update({'journal_id': statement.journal_id and statement.journal_id.name or '',
                                     'ending_bal': statement.total_entry_encoding or 0.0})
                journal_list.append(journal_dict)
        return journal_list

    def get_total_closing(self):
        if self:
            return self.cash_register_balance_end_real

    def get_total_sales(self):
        total_price = 0.0
        if self:
            for order in self.order_ids:
                if order.state != 'draft':
                    total_price += sum([(line.qty * line.price_unit) for line in order.lines])
        return total_price

    def get_total_tax(self):
        total_tax = 0.0
        if self:
            pos_order_obj = self.env['pos.order']
            total_tax += sum([order.amount_tax for order in pos_order_obj.search([('session_id', '=', self.id)])])
        return total_tax

    def get_vat_tax(self):
        taxes_info = []
        if self:
            tax_list = []
            tax_list = [tax.id for order in self.order_ids for line in
                        order.lines.filtered(lambda line: line.tax_ids_after_fiscal_position) for tax in
                        line.tax_ids_after_fiscal_position]
            tax_list = list(set(tax_list))
            for tax in self.env['account.tax'].browse(tax_list):
                total_tax = 0.00
                net_total = 0.00
                for line in self.env['pos.order.line'].search(
                        [('order_id', 'in', [order.id for order in self.order_ids])]).filtered(
                    lambda line: tax in line.tax_ids_after_fiscal_position):
                    total_tax += line.price_subtotal * tax.amount / 100
                    net_total += line.price_subtotal
                taxes_info.append({
                    'tax_name': tax.name,
                    'tax_total': total_tax,
                    'tax_per': tax.amount,
                    'net_total': net_total,
                    'gross_tax': total_tax + net_total
                })
        return taxes_info

    def get_total_discount(self):
        total_discount = 0.0
        discount_product_id = False
        is_discount = self.config_id.module_pos_discount
        if is_discount:
            discount_product_id = self.config_id.discount_product_id.id
        if self and self.order_ids:
            for order in self.order_ids:
                for line in order.lines:
                    total_discount += sum([((line.qty * line.price_unit) * line.discount) / 100])
                    if line.product_id.id == discount_product_id:
                        total_discount += abs(line.price_subtotal_incl)

        # total_discount += sum([((line.qty * line.price_unit) * line.discount) / 100 for line in order.lines])
        return total_discount

    def get_total_first(self):
        total = 0.0
        if self:
            total = ((
                             self.get_total_sales() + self.get_total_tax() + self.get_money_in_total() + self.cash_register_balance_start) + self.get_money_out_total()) \
                    - (abs(self.get_total_discount()))
        return total

    def get_session_date(self, date_time):
        if date_time:
            if self._context and self._context.get('tz'):
                tz = timezone(self._context.get('tz'))
            else:
                tz = pytz.utc
            c_time = datetime.now(tz)
            hour_tz = int(str(c_time)[-5:][:2])
            min_tz = int(str(c_time)[-5:][3:])
            sign = str(c_time)[-6][:1]
            if sign == '+':
                date_time = date_time + timedelta(hours=hour_tz, minutes=min_tz)
            else:
                date_time = date_time - timedelta(hours=hour_tz, minutes=min_tz)
            return date_time.strftime('%d/%m/%Y %I:%M:%S %p')

    def get_session_time(self, date_time):
        if date_time:
            if self._context and self._context.get('tz'):
                tz = timezone(self._context.get('tz'))
            else:
                tz = pytz.utc
            c_time = datetime.now(tz)
            hour_tz = int(str(c_time)[-5:][:2])
            min_tz = int(str(c_time)[-5:][3:])
            sign = str(c_time)[-6][:1]
            if sign == '+':
                date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT) + \
                            timedelta(hours=hour_tz, minutes=min_tz)
            else:
                date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT) - \
                            timedelta(hours=hour_tz, minutes=min_tz)
            return date_time.strftime('%I:%M:%S %p')

    def get_current_date(self):
        if self._context and self._context.get('tz'):
            tz = self._context['tz']
            tz = timezone(tz)
        else:
            tz = pytz.utc
        if tz:
            #             tz = timezone(tz)
            c_time = datetime.now(tz)
            return c_time.strftime('%d/%m/%Y')
        else:
            return date.today().strftime('%d/%m/%Y')

    def get_current_time(self):
        if self._context and self._context.get('tz'):
            tz = self._context['tz']
            tz = timezone(tz)
        else:
            tz = pytz.utc
        if tz:
            #             tz = timezone(tz)
            c_time = datetime.now(tz)
            return c_time.strftime('%I:%M %p')
        else:
            return datetime.now().strftime('%I:%M:%S %p')

    def get_company_data_x(self):
        return self.user_id.company_id

    def get_current_date_x(self):
        if self._context and self._context.get('tz'):
            tz = self._context['tz']
            tz = timezone(tz)
        else:
            tz = pytz.utc
        if tz:
            #             tz = timezone(tz)
            c_time = datetime.now(tz)
            return c_time.strftime('%d/%m/%Y')
        else:
            return date.today().strftime('%d/%m/%Y')

    def get_session_date_x(self, date_time):
        if date_time:
            if self._context and self._context.get('tz'):
                tz = self._context['tz']
                tz = timezone(tz)
            else:
                tz = pytz.utc
            if tz:
                c_time = datetime.now(tz)
                hour_tz = int(str(c_time)[-5:][:2])
                min_tz = int(str(c_time)[-5:][3:])
                sign = str(c_time)[-6][:1]
                if sign == '+':
                    date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT) + \
                                timedelta(hours=hour_tz, minutes=min_tz)
                else:
                    date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT) - \
                                timedelta(hours=hour_tz, minutes=min_tz)
            else:
                date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT)
                # date_time = datetime
            return date_time

    def get_current_time_x(self):
        if self._context and self._context.get('tz'):
            tz = self._context['tz']
            tz = timezone(tz)
        else:
            tz = pytz.utc
        if tz:
            c_time = datetime.now(tz)
            return c_time.strftime('%I:%M %p')
        else:
            return datetime.now().strftime('%I:%M:%S %p')

    def get_session_time_x(self, date_time):
        if date_time:
            if self._context and self._context.get('tz'):
                tz = self._context['tz']
                tz = timezone(tz)
            else:
                tz = pytz.utc
            if tz:
                c_time = datetime.now(tz)
                hour_tz = int(str(c_time)[-5:][:2])
                min_tz = int(str(c_time)[-5:][3:])
                sign = str(c_time)[-6][:1]
                if sign == '+':
                    date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT) + \
                                timedelta(hours=hour_tz, minutes=min_tz)
                else:
                    date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT) - \
                                timedelta(hours=hour_tz, minutes=min_tz)
            else:
                date_time = datetime.strptime(str(date_time), DEFAULT_SERVER_DATETIME_FORMAT)
            return date_time.strftime('%I:%M:%S %p')

    def get_total_sales_x(self):
        total_price = 0.0
        if self:
            for order in self.order_ids:
                if order.state == 'paid':
                    for line in order.lines:
                        total_price += (line.qty * line.price_unit)
        return total_price

    def get_total_returns_x(self):
        pos_order_obj = self.env['pos.order']
        total_return = 0.0
        if self:
            for order in pos_order_obj.search([('session_id', '=', self.id)]):
                if order.amount_total < 0:
                    total_return += abs(order.amount_total)
        return total_return

    def get_total_tax_x(self):
        total_tax = 0.0
        if self:
            pos_order_obj = self.env['pos.order']
            total_tax += sum([order.amount_tax for order in pos_order_obj.search([('session_id', '=', self.id)])])
        return total_tax

    def get_total_discount_x(self):
        total_discount = 0.0
        if self and self.order_ids:
            for order in self.order_ids:
                total_discount += sum([((line.qty * line.price_unit) * line.discount) / 100 for line in order.lines])
        return total_discount

    def get_total_first_x(self):
        global gross_total
        if self:
            gross_total = ((
                                   self.get_total_sales() + self.get_total_tax() + self.get_money_in_total() + self.cash_register_balance_start) + self.get_money_out_total()) \
                          + self.get_total_discount()
        return gross_total

    def get_user_x(self):
        if self._uid == SUPERUSER_ID:
            return True

    def get_gross_total_x(self):
        total_cost = 0.0
        gross_total = 0.0
        if self and self.order_ids:
            for order in self.order_ids:
                for line in order.lines:
                    total_cost += line.qty * line.product_id.standard_price
        gross_total = self.get_total_sales() - \
                      + self.get_total_tax() - total_cost
        return gross_total

    def get_net_gross_total_x(self):
        net_gross_profit = 0.0
        total_cost = 0.0
        if self and self.order_ids:
            for order in self.order_ids:
                for line in order.lines:
                    total_cost += line.qty * line.product_id.standard_price
            net_gross_profit = self.get_total_sales() - self.get_total_tax() - total_cost
        return net_gross_profit

    def get_product_cate_total_x(self):
        balance_end_real = 0.0
        if self and self.order_ids:
            for order in self.order_ids:
                if order.state == 'paid':
                    for line in order.lines:
                        balance_end_real += (line.qty * line.price_unit)
        return balance_end_real

    def get_product_name_x(self, category_id):
        if category_id:
            category_name = self.env['pos.category'].browse([category_id]).name
            return category_name

    def get_product_category_x(self):
        product_list = []
        if self and self.order_ids:
            for order in self.order_ids:
                if order.state == 'paid':
                    for line in order.lines:
                        flag = False
                        product_dict = {}
                        for lst in product_list:
                            if line.product_id.pos_categ_id:
                                if lst.get('pos_categ_id') == line.product_id.pos_categ_id.id:
                                    lst['price'] = lst['price'] + (line.qty * line.price_unit)
                                    # if line.product_id.pos_categ_id.show_in_report:
                                    lst['qty'] = lst.get('qty') or 0.0 + line.qty
                                    flag = True
                            else:
                                if lst.get('pos_categ_id') == '':
                                    lst['price'] = lst['price'] + (line.qty * line.price_unit)
                                    lst['qty'] = lst.get('qty') or 0.0 + line.qty
                                    flag = True
                        if not flag:
                            if line.product_id.pos_categ_id:
                                product_dict.update({
                                    'pos_categ_id': line.product_id.pos_categ_id and line.product_id.pos_categ_id.id or '',
                                    'price': (line.qty * line.price_unit),
                                    'qty': line.qty
                                })
                            else:
                                product_dict.update({
                                    'pos_categ_id': line.product_id.pos_categ_id and line.product_id.pos_categ_id.id or '',
                                    'price': (line.qty * line.price_unit),
                                })
                            product_list.append(product_dict)
        return product_list

    def get_payments_x(self):
        if self:
            statement_line_obj = self.env["account.bank.statement.line"]
            pos_order_obj = self.env["pos.order"]
            company_id = self.env['res.users'].browse([self._uid]).company_id.id
            pos_ids = pos_order_obj.search([('session_id', '=', self.id),
                                            ('state', 'in', ['paid', 'invoiced', 'done']),
                                            ('user_id', '=', self.user_id.id), ('company_id', '=', company_id)])
            data = {}
            if pos_ids:
                pos_ids = [pos.id for pos in pos_ids]
                st_line_ids = statement_line_obj.search([('pos_statement_id', 'in', pos_ids)])
                if st_line_ids:
                    a_l = []
                    for r in st_line_ids:
                        a_l.append(r['id'])
                    self._cr.execute(
                        "select aj.name,sum(amount) from account_bank_statement_line as absl,account_bank_statement as abs,account_journal as aj " \
                        "where absl.statement_id = abs.id and abs.journal_id = aj.id  and absl.id IN %s " \
                        "group by aj.name ", (tuple(a_l),))

                    data = self._cr.dictfetchall()
                    return data
            else:
                return {}

    def get_money_in_total(self):
        if self:
            amount = 0
            account_bank_stmt_ids = self.env['account.bank.statement'].search([('pos_session_id', '=', self.id)])
            for account_bank_stmt in account_bank_stmt_ids:
                for line in account_bank_stmt.line_ids:
                    if line and line.is_money_in:
                        amount += line.amount
        return amount

    def get_money_out_details(self):
        money_out_lst = []
        if self:
            account_bank_stmt_ids = self.env['account.bank.statement'].search([('pos_session_id', '=', self.id)])
            for account_bank_stmt in account_bank_stmt_ids:
                for line in account_bank_stmt.line_ids:
                    if line and line.is_money_out:
                        money_out_lst.append({
                            'name': line.name,
                            'amount': line.amount,
                        })
        return money_out_lst

    def get_money_out_total(self):
        if self:
            amount = 0
            account_bank_stmt_ids = self.env['account.bank.statement'].search([('pos_session_id', '=', self.id)])
            for account_bank_stmt in account_bank_stmt_ids:
                for line in account_bank_stmt.line_ids:
                    if line and line.is_money_out:
                        amount += line.amount
        return amount

    def get_money_in_details(self):
        money_in_lst = []
        if self:
            account_bank_stmt_ids = self.env['account.bank.statement'].search([('pos_session_id', '=', self.id)])
            for account_bank_stmt in account_bank_stmt_ids:
                for line in account_bank_stmt.line_ids:
                    if line and line.is_money_in:
                        money_in_lst.append({
                            'name': line.name,
                            'amount': line.amount,
                        })
        return money_in_lst

    @api.model
    def get_session_report(self):
        try:
            #             sql query for get "In Progress" session
            self._cr.execute("""
                select ps.id,pc.name, ps.name from pos_session ps
                left join pos_config pc on (ps.config_id = pc.id)
                where ps.state='opened'
            """)
            session_detail = self._cr.fetchall()
            #
            self._cr.execute("""
                SELECT pc.name, ps.name, sum(absl.amount) FROM pos_session ps
                JOIN pos_config pc on (ps.config_id = pc.id)
                JOIN account_bank_statement_line absl on (ps.name = absl.ref)
                WHERE ps.state='opened'
                GROUP BY ps.id, pc.name;
            """)
            session_total = self._cr.fetchall()
            #             sql query for get payments total of "In Progress" session
            lst = []
            for pay_id in session_detail:
                self._cr.execute("""
                    select pc.name, aj.name, abs.total_entry_encoding from account_bank_statement abs
                    join pos_session ps on abs.pos_session_id = ps.id
                    join pos_config pc on ps.config_id = pc.id
                    join account_journal aj on  abs.journal_id = aj.id
                    where pos_session_id=%s
                """ % pay_id[0])
                bank_detail = self._cr.fetchall()
                for i in bank_detail:
                    if i[2] != None:
                        lst.append({'session_name': i[0], 'journals': i[1], 'total': i[2]})

            cate_lst = []
            for cate_id in session_detail:
                self._cr.execute("""
                    select pc.name, sum(pol.price_unit), poc.name from pos_category pc
                    join product_template pt on pc.id = pt.pos_categ_id
                    join product_product pp on pt.id = pp.product_tmpl_id
                    join pos_order_line pol on pp.id = pol.product_id
                    join pos_order po on pol.order_id = po.id
                    join pos_session ps on ps.id = po.session_id
                    join pos_config poc ON ps.config_id = poc.id
                    where po.session_id = %s
                    group by pc.name, poc.name
                """ % cate_id[0])
                cate_detail = self._cr.fetchall()
                for j in cate_detail:
                    cate_lst.append({'cate_name': j[0], 'cate_total': j[1], 'session_name': j[2]})
            categ_null = []
            for cate_id_null in session_detail:
                self._cr.execute(""" 
                    select sum(pol.price_unit), poc.name from pos_order_line pol
                    join pos_order po on po.id = pol.order_id
                    join product_product pp on pp.id = pol.product_id
                    join product_template pt on pt.id = pp.product_tmpl_id
                    join pos_session ps on ps.id = po.session_id
                    join pos_config poc on ps.config_id = poc.id
                    where po.session_id = %s and pt.pos_categ_id is null
                    group by poc.name
                """ % cate_id_null[0])
                categ_null_detail = self._cr.fetchall()
                for k in categ_null_detail:
                    categ_null.append({'cate_name': 'Undefined Category', 'cate_total': k[0], 'session_name': k[1]})
            all_cat = []
            for sess in session_total:
                def_cate_lst = []
                for j in cate_lst:
                    if j['session_name'] == sess[0]:
                        def_cate_lst.append(j)
                for k in categ_null:
                    if k['session_name'] == sess[0]:
                        def_cate_lst.append(k)
                all_cat.append(def_cate_lst)
            return {'session_total': session_total, 'payment_lst': lst, 'all_cat': all_cat}
        except Exception as e:
            return {'error': 'Error Function Working'}
