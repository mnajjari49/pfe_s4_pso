# -*- coding: utf-8 -*-


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

    enable_pos_return = fields.Boolean("Return Order/Products", help="Allow to return product from POS")
    enable_print_valid_days = fields.Boolean("Print Product Return Valid days", help='Prod', default=False)


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    @api.model
    def load_return_order_lines(self, pos_order_id):
        valid_return_lines = []
        print(">>>>>>>>>>>>>>>>", pos_order_id)
        if pos_order_id:
            print('========>', self.search_read([('order_id', '=', pos_order_id)]), '<============')
            valid_return_lines =  self.search_read([('order_id', '=', pos_order_id)])
        return valid_return_lines

    @api.model
    def create(self, values):
        # if values.get('product_id'):
        #     # if self.env['pos.order'].browse(values['order_id']).session_id.config_id.prod_for_payment.id == values.get(
        #     #         'product_id'):
        #     #     return
        #     if self.env['pos.order'].browse(
        #             values['order_id']).session_id.config_id.refund_amount_product_id.id == values.get('product_id'):
        #         return
        # if values.get('cancel_item_id'):
        #     line_id = self.browse(values.get('cancel_item_id'))
        #     if line_id and values.get('new_line_status'):
        #         values.update({'line_status': values.get('new_line_status')})
        res = super(PosOrderLine, self).create(values)
        for r in res:
            r.return_qty = abs(r.qty)
        return res

    cancel_item = fields.Boolean("Cancel Item")
    cost_price = fields.Float("Cost")
    line_status = fields.Selection(
        [('nothing', 'Nothing'), ('full', 'Fully Cancelled'), ('partial', 'Partially Cancelled')],
        'Order Status', default="nothing")
    line_note = fields.Char('Comment', size=512)
    deliver = fields.Boolean("Is deliver")
    return_qty = fields.Integer('Return QTY', size=64)
    return_process = fields.Char('Return Process')
    back_order = fields.Char('Back Order', size=256, default=False, copy=False)
    location_id = fields.Many2one('stock.location', string='Location')
    serial_nums = fields.Char("Serials")
    return_valid_days = fields.Integer(string="Return Valid Days", default=365)
    #
    # def return_q(self):
    #     for r in self:
    #         r.return_qty = r.


class PosOrder(models.Model):
    _inherit='pos.order'

    parent_return_order = fields.Char('Return Order ID', size=64)
    return_order = fields.Many2one('pos.order', string="Return order")
    return_seq = fields.Integer('Return Sequence')
    back_order = fields.Char('Back Order', size=256, default=False, copy=False)



    def _order_fields(self, ui_order):
        res = super(PosOrder, self)._order_fields(ui_order)
        res.update({
            'return_order': ui_order.get('return_order', ''),
            'back_order': ui_order.get('back_order', ''),
            'parent_return_order': ui_order.get('parent_return_order', ''),
            'return_seq': ui_order.get('return_seq', ''),
        })
        print('=============================')
        print('RO', ui_order.get('return_order', ''))
        print('bo', ui_order.get('back_order', ''))
        print('seq', ui_order.get('return_seq', ''))
        print('parent',ui_order.get('parent_return_order', ''))
        return res
