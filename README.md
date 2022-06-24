# Att_Renamer
Benennt ankommende Angriffe in der deutschen Version des Browsergames "Die Stämme" abhängig ihrer Laufzeit um. Kann Rückkehrzeit, Name und Dorf des angreifenden Spielers anhängen.

## Anwendung

Benötigt einen Premium-Acc um auf die Übersichtsseite "Eingehende Angriffe" zugreifen zu können.
Auf dieser Seite befindet sich ein zusätzlicher Button für die Optionen sowie ein roter bzw. grüner Punkt, der den Status des Scripts anzeigt.

Es muss dem Browser erlaubt sein, das "die-staemme.de" selbstständig neue Tabs öffnen darf!

## Funktionsprinzip

Das Script sucht nach dem Laden der Seite nach eingehenden Angriffen, die noch "Angriff" heißen, also noch nicht umbenannt wurden (Vom Spieler umbenannte Angriffe werden vom Script ignoriert). Dann wird pro "neuem" Angriff ein neuer Tab mit der jeweiligen Angriffsübersicht geöffnet. In diesem neuen Tab wird die langsamste Einheit berechnet, die im Angriff vorhanden ist und schließlich wird der Angriff umbenannt. Der neue Tab wird geschlossen.

Um neue Angriffe möglichst zeitnah zu erfassen, wird die Übersicht "Eingehende Angriffe" nach einer bestimmten Zeit (10m) vom Script aktuallisiert und effektiv neu gestartet.

Damit das Script im "Hintergrund" bzw. ohne weitere Hilfe des Spielers funktionieren kann, muss dementsprechend ein Tab/Fenster mit der eingehende Angriffe Übersicht geöffnet bleiben. Ist dieser Tab nicht geöffnet, werden neue Angriffe nicht umbenannt. Ein späteres Öffnen des Tabs führt evtl. zu einer fehlerhaften Umbenennung "neuer" Angriffe. 

## Sonstiges

Bei Fragen, Rückmeldung oder Verbesserungsvorschlägen schau doch gerne auf meinem kleinen Support Discord vorbei: https://discord.gg/64M3R7X6Yt

Weiterhin helfe ich gerne, falls Du das Scripten für DS erlernen willst!

Die Verwendung des Scripts ist kostenlos. Die Weiterverbreitung oder Modifizierung ist gestattet und erwünscht. Solltest Du dieses oder andere Scripte von mir weiterentwickeln, sei doch so nett und zeig mir die Ergebnisse!
