node-bikeshare-member-scraper
=============================

nodejs scraper for capital bikeshare (probably others too) profiles

I wanted to get my data off of [Capital Bikeshare](www.capitalbikeshare.com) but wanted to stick to Node.JS instead of python or ruby (which are out there)... so I wrote my own.

Using ZombieJS I'm able to login, scrape profiles for various data and check for updates.

I'm using a wait time for each request of ~~10~~ 15 seconds.  The site is pretty slow and I as having issues with missing data on multiple calls.

==TODO==

* ~~Member Profile~~
* ~~Total Number of Rentals~~
* ~~Get All of Rental History~~
* ~~Get Rentals Since Last Total~~
* ~~Get Last # Rentals~~
* ~~Rental Statistics (from data provided)~~
* Get Rentals Since Date(?)