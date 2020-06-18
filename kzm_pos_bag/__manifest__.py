# -*- coding: utf-8 -*-
{
    'name': "POS Bags Charges",

    'summary': """Add Bag charges to POS""",
    'description': """""",
    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necesary for this one to work correctly
    'depends': ['base', 'kzm_pos_side_bar', 'kzm_pos_config'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'data/data.xml',
        'views/product_view.xml',
        'views/templates.xml',
        'views/res_users_view.xml',
        'views/pos_config.xml',
    ],
    'qweb': ['static/src/xml/*.xml'],
    'installable': True,
}
