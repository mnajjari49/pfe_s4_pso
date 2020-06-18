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

    def _get_default_location(self):
        return self.env['stock.warehouse'].search([('company_id', '=', self.env.user.company_id.id)],
                                                  limit=1).lot_stock_id

    show_qty = fields.Boolean(string='Display Stock', help='To show the quantity of product in POS Screens')
    display_warehouse_qty = fields.Boolean("Display Warehouse Quantity", help='To show the quantity of product in Warehouse locations')
    stock_location_id = fields.Many2one(
        'stock.location', string='Stock Location',
        domain=[('usage', '=', 'internal')], required=True, default=_get_default_location, help='The product location')
    restrict_order = fields.Boolean(string='Restrict Order When Out Of Stock', help='Activate restrictions on products if our of stock')
    prod_qty_limit = fields.Integer(string="Restrict When Product Qty Remains", help='Design the quantity minimun of a product remaining')
    custom_msg = fields.Char(string="Custom Message", help='Here is the specific message you want to display')
