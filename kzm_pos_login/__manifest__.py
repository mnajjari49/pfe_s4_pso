# -*- coding: utf-8 -*-
{
    'name': "POS Login",

    'summary': """For login into POS""",
    'description': """""",
    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necesary for this one to work correctly
    'depends': ['base', 'pos_hr', 'kzm_pos_config', 'kzm_pos_close'],

    # always loaded
    'data': [
        'security/ir.model.access.csv',
        'views/views.xml',
        'views/templates.xml',
        'views/res_users_view.xml',
    ],
    'qweb': ['static/src/xml/login.xml'],
    'installable': True,
}
