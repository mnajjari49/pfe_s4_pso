# -*- coding: utf-8 -*-

from odoo import fields, models, api, _
from datetime import datetime, timedelta
from odoo.exceptions import Warning
from odoo.tools import DEFAULT_SERVER_DATETIME_FORMAT
import time
from pytz import timezone
from odoo.exceptions import UserError, ValidationError
from odoo.tools import float_is_zero


class PosOrder(models.Model):
    _inherit = "pos.order"


class PosConfig(models.Model):
    _inherit = 'pos.config'

    customer_display = fields.Boolean("Customer Display", help="Allow to show customer display")
    image_interval = fields.Integer("Image Interval", default=10, help="The duration of the image in the screen")
    customer_display_details_ids = fields.One2many('customer.display', 'config_id', "Customer Display Details", help="Images details")
    enable_customer_rating = fields.Boolean("Customer Display Rating", help='Show the customer display rating')
    set_customer = fields.Boolean("Select/Create Customer", help="Create or select customer in customer display")

