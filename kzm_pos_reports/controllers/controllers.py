# -*- coding: utf-8 -*-
# from odoo import http
# -*- coding: utf-8 -*-

import json

from odoo import http
from odoo.http import request
from odoo.tools.translate import _
import werkzeug.utils
import hashlib
from odoo import http
import json
from odoo.addons.web.controllers.main import Home, ensure_db
from odoo.addons.bus.controllers.main import BusController

import logging

_logger = logging.getLogger(__name__)


# class KzmPosReports(http.Controller):
#     @http.route('/kzm_pos_reports/kzm_pos_reports/', auth='public')
#     def index(self, **kw):
#         return "Hello, world"

#     @http.route('/kzm_pos_reports/kzm_pos_reports/objects/', auth='public')
#     def list(self, **kw):
#         return http.request.render('kzm_pos_reports.listing', {
#             'root': '/kzm_pos_reports/kzm_pos_reports',
#             'objects': http.request.env['kzm_pos_reports.kzm_pos_reports'].search([]),
#         })

#     @http.route('/kzm_pos_reports/kzm_pos_reports/objects/<model("kzm_pos_reports.kzm_pos_reports"):obj>/', auth='public')
#     def object(self, obj, **kw):
#         return http.request.render('kzm_pos_reports.object', {
#             'object': obj
#         })

class TerminalLockController(BusController):

    def _poll(self, dbname, channels, last, options):
        """Add the relevant channels to the BusController polling."""
        # if options.get('customer.display'):
        #     channels = list(channels)
        #     ticket_channel = (
        #         request.db,
        #         'customer.display',
        #         options.get('customer.display')
        #     )
        #     channels.append(ticket_channel)
        #
        # if options.get('lock.data'):
        #     channels = list(channels)
        #     lock_channel = (
        #         request.db,
        #         'lock.data',
        #         options.get('lock.data')
        #     )
        #     channels.append(lock_channel)
        # # Order Sync
        if options.get('sale.note'):
            channels = list(channels)
            lock_channel = (
                request.db,
                'sale.note',
                options.get('sale.note')
            )
            channels.append(lock_channel)
        return super(TerminalLockController, self)._poll(dbname, channels, last, options)
