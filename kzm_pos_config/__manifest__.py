# -*- coding: utf-8 -*-
{
    'name': "POS  Config",
    'summary': """POS Custom Config""",
    'description': """""",

    'author': "Karizma",
    'website': "http://www.karizma.ma",
    'category': 'Point of Sale',
    'version': '13.0',
    # any module necessary for this one to work correctly
    'depends': ['base', 'point_of_sale'],

    # always loaded
    'data': [
        # 'security/ir.model.access.csv',
        'views/pos_config.xml',
        'views/res_users_view.xml',
    ],
}