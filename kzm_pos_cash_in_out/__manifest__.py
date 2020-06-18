# -*- coding: utf-8 -*-
{
    'name': "POS Cash In|Out",
    'summary': """Enter or Exit cash from POS Box""",
    'description': """This module allow to Enter or Exit cash from POS Box""",

    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necessary for this one to work correctly
    'depends': ['base', 'kzm_pos_side_bar', 'account', 'kzm_pos_config'],

    # always loaded  kzm_pos_cash_in_out
    'data': [
        'security/ir.model.access.csv',
        'views/pos_config.xml',
        'views/cash_in_out.xml',
        'views/templates.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
}