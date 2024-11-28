# cmpm-121-demo-3

D3.a changes/notes:
-chatgpt helped with popups: https://chatgpt.com/share/672d5eee-d078-8001-9629-544be7e2ba1f
-chatgpt helped a bit with Cache interface: https://chatgpt.com/share/672d6a83-8f00-8001-b28a-53e15fb27f5a

D3.b changes/notes:
-used chatgpt to help with flyweight: https://chatgpt.com/share/672f6ccb-64ac-8001-88d9-2d98aff561e2
Instead of creating a board file, im creating the flyweight pattern in one file because it fits my design better
-used chatgpt to help with coin formatting: https://chatgpt.com/share/672f773c-af48-8001-b658-bb1b9643242f

D3.c changes/notes:
-chatgpt helped with player and map movement: https://chatgpt.com/share/67351ac7-879c-8001-83d3-fd53a1b3dc71
-had conversations like these with chatgpt about memento implementation and helper functions:
https://chatgpt.com/share/673a875c-f494-8001-8a62-7ee14d5723c7
https://chatgpt.com/share/673aa3b0-ec9c-8001-8c12-3ba26a2166a4

D3.d changes/notes:
-chatgpt helped with geolocation: https://chatgpt.com/share/673d72fa-2630-8001-a28f-d8a68c9a734b
-chatgpt helped with save/restore/reset game state: https://chatgpt.com/c/673d5f31-baf8-8001-a52a-c794679e7aea
-chatgpt helped wtih polyline: https://chatgpt.com/share/673d667b-e4f8-8001-8b70-8c4137ddde7e

D3.e changes/notes:

I first started with increasing the cohesion in my code. Brace recommended doing this first, because my flyweight cache class was handling too many responsibilities at once. I decided to start with cohesion because I wanted to focus on getting all the class refactoring out of the way before moving on to reducing coupling. I took some of the ideas that Brace gave me and created a cache manager to handle the cache creation and cache property functions, a gamestate class to handle all the game state related functions, and the flyweight cache to manage the other two classes. 

I wanted to guide brace into using the extract class refactor method, and after it gave me those ideas, I realized that even some of the functions outside of the classes belonged inside other classes. So I removed functions such as getcellcenter and getcellbounds that were outside of a class, and placed them in their respective classes that way each class is more cohesive.
