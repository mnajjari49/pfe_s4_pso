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

    restrict_lot_serial = fields.Boolean("Restrict Lot/Serial Quantity",
                                         help="Allow the restriction Lot/Serial number in POS")
    enable_pos_serial = fields.Boolean("Enable POS serials", help="Allow serials number in POS")


class PosOrderLine(models.Model):
    _inherit = 'pos.order.line'

    serial_nums = fields.Char("Serials")
