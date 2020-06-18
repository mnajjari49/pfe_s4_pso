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


class PosSession(models.Model):
    _inherit = 'pos.session'

    current_cashier_id = fields.Many2one('res.users', string="Cashier", readonly=True)
    # cashcontrol_ids = fields.One2many(comodel_name="custom.cashcontrol", inverse_name="pos_session_id",
    #                                   string="Cash Control Information")
    opening_balance = fields.Boolean(string="Opening Balance")

    # shop_id = fields.Many2one('pos.shop', string='Shop', related='config_id.multi_shop_id')

    def get_pos_name(self):
        if self and self.config_id:
            return self.config_id.name

    def custom_close_pos_session(self):
        self._check_pos_session_balance()

        for session in self:
            print(session.statement_ids)
            print("###", self.cash_register_id)
            session.write({'state': 'closing_control', 'stop_at': fields.Datetime.now()})
            if not session.config_id.cash_control:
                print("here")
                return session.action_pos_session_close()
            if session.config_id.cash_control:
                session._check_pos_session_balance()
                return session.action_pos_session_close()

    def cash_control_line(self, vals):
        total_amount = 0.00
        if vals:
            self.cashcontrol_ids.unlink()
            for data in vals:
                self.env['custom.cashcontrol'].create(data)
        for cash_line in self.cashcontrol_ids:
            total_amount += cash_line.subtotal
        for statement in self.statement_ids:
            statement.write({'balance_end_real': total_amount})
        return True

    def open_balance(self, vals):
        cash_journal = []
        for statement in self.statement_ids:
            if statement.journal_id.type == 'cash':
                cash_journal.append(statement)
        if len(cash_journal) > 0:
            cash_journal[0].write({'balance_start': vals})
        self.write({'opening_balance': False})
        return True
