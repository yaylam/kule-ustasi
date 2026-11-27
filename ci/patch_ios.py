import plistlib
p = 'ios/App/App/Info.plist'
d = plistlib.load(open(p, 'rb'))
d['GADApplicationIdentifier'] = 'ca-app-pub-8647614182701788~1207970889'
d['NSUserTrackingUsageDescription'] = 'Bu izin, sana daha ilgili reklamlar göstermek için kullanılır.'
d['ITSAppUsesNonExemptEncryption'] = False
d['UISupportedInterfaceOrientations'] = ['UIInterfaceOrientationPortrait']
d['UISupportedInterfaceOrientations~ipad'] = ['UIInterfaceOrientationPortrait', 'UIInterfaceOrientationPortraitUpsideDown']
skan = ['cstr6suwn9','4fzdc2evr5','2fnua5tdw4','ydx93a7ass','p78axxw29g','v72qych5uu','ludvb6z3bs','cp8zw746q7','3sh42y64q3','c6k4g5qg8m','s39g8k73mm','3qy4746246','hs6bdukanm','mlmmfzh3r3','v4nxqhlyqp','wzmmz9fp6w','su67r6k2v3','yclnxrl5pm','7ug5zh24hu','gta9lk7p23','vutu7akeur','y5ghdn5j9k','v9wttpbfk9','n38lu8286q','47vhws6wlr','kbd757ywx3','9t245vhmpl','a2p9lx4jpn','22mmun2rn5','44jx6755aq','k674qkevps','4468km3ulz','2u9pt9hc89','8s468mfl3y','klf5c3l5u5','ppxm28t8ap','kbmxgpxpgc','uw77j35x4d','578prtvx9j','4dzt52r2t5','tl55sbb4fm','c3frkrj4fj','e5fvkxwrpn','8c4e2ghe7u','3rd42ekr43','97r2b46745','3qcr597p9d']
d['SKAdNetworkItems'] = [{'SKAdNetworkIdentifier': k + '.skadnetwork'} for k in skan]
plistlib.dump(d, open(p, 'wb'))
print('Info.plist patched')
