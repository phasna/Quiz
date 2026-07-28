# Tests Bruno - API Quiz

Une ligne = une requete + un petit commentaire.

```text
GET    http://localhost:3000/hello                                              # verifier que l'API repond

POST   http://localhost:3000/api/auth/register                                  # creer un utilisateur
POST   http://localhost:3000/api/auth/login                                     # recuperer le token JWT

GET    http://localhost:3000/api/users                                          # lister les utilisateurs
GET    http://localhost:3000/api/users/1                                        # voir l'utilisateur 1
GET    http://localhost:3000/api/users/99999                                    # tester utilisateur inexistant
PATCH  http://localhost:3000/api/users/1/avatar                                # lier un avatar a l'utilisateur 1 (Bearer + JSON)

GET    http://localhost:3000/api/questions                                      # lister les questions
PATCH  http://localhost:3000/api/questions/1/image                             # ajouter une image a la question 1 (JSON)
PATCH  http://localhost:3000/api/questions/99999/image                         # tester question inexistante

POST   http://localhost:3000/api/submit                                         # envoyer une bonne ou mauvaise reponse (Bearer + JSON)

POST   http://localhost:3000/api/media/upload                                   # uploader une image (Bearer + Multipart Form)
GET    http://localhost:3000/api/media                                          # lister les medias
GET    http://localhost:3000/api/media/1                                        # voir le media 1
GET    http://localhost:3000/api/media/99999                                    # tester media inexistant
GET    http://localhost:3000/api/media/1/transform?width=200&format=webp&quality=80  # tester la transformation d'image
DELETE http://localhost:3000/api/media/1                                        # supprimer le media 1 (Bearer)
```
