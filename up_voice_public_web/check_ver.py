import requests
url = 'https://university-social-listening-platform-ruq2.vercel.app/'
try:
    r = requests.get(url)
    for line in r.text.split('<'):
        if 'script' in line and 'src=' in line:
            src = line.split('src=')[1].split('>')[0].strip('"').strip("'")
            bundle_url = 'https://university-social-listening-platform-ruq2.vercel.app' + src
            print('Bundle URL:', bundle_url)
            r2 = requests.get(bundle_url)
            if 'while(' in r2.text.replace(' ', '') and 'length%4' in r2.text.replace(' ', ''):
                print('FIX IS PRESENT IN RUQ2!')
            else:
                print('FIX IS NOT PRESENT IN RUQ2!')
except Exception as e:
    print('Error:', e)
