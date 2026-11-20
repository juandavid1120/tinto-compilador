import json,sys
d=json.load(open(sys.argv[1]))
print(d['vig'], d['ms'])
for k,v in d['res']['estados'].items():
    print('==',k, 'pag', v['scrollPagina'], 'cortados', v['cortadosTotal'], 'scrollInt', v['enScrollInternoTotal'], 'retos', v.get('retos'))
    p=v['personajes']
    print('   pers: anchos',p['anchoTarjetas'],'salen',p['salenDeTarjeta'],'montados',p['textosMontadosEntreTarjetas'],'flechas',p['textosQuePisanFlechas'],'partidos',p['tarjetasConNombrePartidoEnVariasLineas'])
    print('   barraEditor',v.get('barraEditor'),'error',v.get('error'),'fuera',v['fueraDeVentana'])
    for c in v['cortados'][:10]: print('   CORTADO',c)
