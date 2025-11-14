# creative-coding-webtools
Noa Dufresne
### ✳ L'idée, en quelques mots
- Flows de particules (& perlin noise)
- Formes organiques
- Couleurs
- [nice to have] Effets de glitch (Pixel Sorting)

##### Références
- [Oeuvres de Tyler Hobbs]([https://](https://www.lerandom.art/editorial/tyler-hobbs-on-algorithmic-aesthetics))
- [Perlin Noise Flow Field, The Coding Train]([https://](https://thecodingtrain.com/challenges/24-perlin-noise-flow-field))
- [Getting Creative with Perlin Noise Fields, sighack]([https://](https://sighack.com/post/getting-creative-with-perlin-noise-fields))
- [A look into Flow Fields, Medium]([https://](https://haneeen.medium.com/a-look-into-flow-fields-cf4a5663b831))
  
##### Images moodboard

<p align="center">
  <img src="images/moodboard-1.png" width="22%" />
  <img src="images/moodboard-2.jpg" width="22%" />
  <img src="images/moodboard-3.png" width="22%" />
  <img src="images/moodboard-4.avif" width="22%" />
</p>
<p align="center">
  <img src="images/moodboard-6.jpg" width="22%" />
  <img src="images/moodboard-7.jpg" width="22%" />
  <img src="images/moodboard-8.jpg" width="22%" />
</p>

### ✳ Description du projet
Ce projet est un outil créatif permettant de générer des visuels à partir d’un champ de flux basé sur le bruit de Perlin.
Ces visuels combinent des lignes générées par le bruit de Perlin et des formes colorés qui suivent certaines de ces lignes.

L’utilisateur peut modifier la densité, la largeur ou les couleurs, et afficher ou masquer les lignes et les formes colorées.
<br>

###### Si possible à ajouter:
✳ Ajout d'un effet de glitch (Pixel Sorting) par dessus les formes générées
✳ Changer l'épaisseur des lignes
<br>


###### Premières idées de réglages UI
L’outil propose un panneau de contrôle qui permet d’ajuster facilement chaque aspect de la génération visuelle.

L’utilisateur pourra modifier en temps réel :

- La résolution du champ de flux (taille de la grille)

- La longueur et la fluidité des lignes

- La densité des formes générées (nombre de formes)

- La largeur des formes

- L’affichage (ou non) des lignes du flow field

- Le choix des couleurs (ou variation automatique)

- L’activation de l’effet Pixel Sorting et son intensité

- La régénération complète du visuel

*ⓘ Pour ajuster rapidement les paramètres lors de mes expérimentations (comme la densité du flow field, la longueur des lignes etc..), j’ai utilisé un petit panneau de contrôle générique via une librairie GUI : `const gui = new dat.GUI();`
Cela m’a permis de tester visuellement les réglages sans modifier le code à chaque fois.*

### ✳ Snippets

##### Génération du Perlin noise
Ce snippet montre comment le bruit de Perlin est utilisé pour créer des directions "random" et organiques dans le champ de flux.
![alt text](image-3.png)

##### Génération d’un champ de flux
![alt text](image.png)

##### Tracer les lignes du flux
Calcule le chemin que suivra chaque ligne en suivant la direction du champ de flux généré par le bruit de Perlin.

![alt text](image-1.png)

##### Dessiner les lignes
![alt text](image-2.png)

##### Créer des formes colorées suivant le flow
![alt text](image-4.png)


##### Effet de Pixel sorting
![alt text](image-5.png)
[Source de ce snippet de pixel sorting, par Patt Vira]([https://](https://www.youtube.com/watch?v=nNQk9AMYYGk))

<br>

#### Première expérimentations codées en utilisant les snippets

##### Flow field + perlin noise

![Image expérimentation 1](images/screenshot_8.png)


##### Avec formes colorées

![Image expérimentation 1](images/screenshot_1.png)

![Image expérimentation 1](images/screenshot_2.png)

![Image expérimentation 1](images/screenshot_3.png)

![Image expérimentation 1](images/screenshot_6.png)

*En masquant les lignes de flux*
![Image expérimentation 1](images/screenshot_4.png)


##### Avec effet de Glitch (via pixel sorting)

![Image expérimentation 1](images/screenshot_5.png)

![Image expérimentation 1](images/screenshot_7.png)

