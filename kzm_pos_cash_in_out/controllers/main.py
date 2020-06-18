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


class PosSpeedControl(BusController):
    def _poll(self, dbname, channels, last, options):
        if request.session.uid:
            channels = list(channels)
            channels.append((request.db, 'change_detector'))
        return super(PosSpeedControl, self)._poll(dbname, channels, last, options)


# class Home(Home):
#     @http.route('/web/login', type='http', auth="none", sitemap=False)
#     def web_login(self, redirect=None, **kw):
#         res = super(Home, self).web_login(redirect, **kw)
#         if request.params['login_success']:
#             uid = request.session.authenticate(request.session.db, request.params['login'], request.params['password'])
#             users = request.env['res.users'].browse([uid])
#             if users.login_with_pos_screen:
#                 pos_session = request.env['pos.session'].sudo().search(
#                     [('config_id', '=', users.default_pos.id), ('state', '=', 'opened')])
#                 if pos_session:
#                     return http.redirect_with_hash('/pos/web')
#                 else:
#                     session_id = users.default_pos.open_session_cb()
#                     pos_session = request.env['pos.session'].sudo().search(
#                         [('config_id', '=', users.default_pos.id), ('state', '=', 'opening_control')])
#                     if users.default_pos.cash_control:
#                         pos_session.write({'opening_balance': True})
#                     session_open = pos_session.action_pos_session_open()
#                     return http.redirect_with_hash('/pos/web')
#             else:
#                 return res
#         else:
#             return res