SRC=src
SRC_PUBLIC=$(SRC)/public
SRC_PUBLIC_JS=$(SRC_PUBLIC)/javascripts
SRC_PUBLIC_IMG=$(SRC_PUBLIC)/images
SRC_PUBLIC_CSS=$(SRC_PUBLIC)/stylesheets
SRC_PUBLIC_HANDLEBARS=$(SRC_PUBLIC)/handlebars
SRC_PUBLIC_COFFEE=$(SRC_PUBLIC)/coffee
SRC_VIEWS=$(SRC)/views
SRC_ROUTES=$(SRC)/routes

BUILD=build
BUILD_PUBLIC=$(BUILD)/public
BUILD_PUBLIC_CSS=$(BUILD_PUBLIC)/stylesheets
BUILD_PUBLIC_JS=$(BUILD_PUBLIC)/javascripts
BUILD_ROUTES=$(BUILD)/routes

TEMP=temp

all:
	mkdir -p $(TEMP)
	mkdir -p $(BUILD)
	mkdir -p $(BUILD_PUBLIC_CSS)
	mkdir -p $(BUILD_ROUTES)
	cp $(SRC)/package.json $(BUILD)/
	coffee --output $(BUILD)/ --compile $(SRC)/app.coffee
	cp -R $(SRC_PUBLIC_JS) $(BUILD_PUBLIC)/
	cp -R $(SRC_PUBLIC_IMG) $(BUILD_PUBLIC)/
	stylus $(SRC_PUBLIC_CSS) --out $(BUILD_PUBLIC_CSS)/
	cp $(SRC_PUBLIC_CSS)/*.css $(BUILD_PUBLIC_CSS)/
	cp -R $(SRC_VIEWS) $(BUILD)/
	coffee --output $(BUILD_ROUTES)/ --compile $(SRC_ROUTES)/
	cat $(SRC_PUBLIC_COFFEE)/* > $(TEMP)/main.coffee
	coffee -co $(BUILD_PUBLIC_JS) $(TEMP)/main.coffee 
	#coffee --join $(BUILD_PUBLIC_JS)/main.js --compile $(SRC_PUBLIC_COFFEE)/*.coffee
	handlebars $(SRC_PUBLIC_HANDLEBARS) -f $(BUILD_PUBLIC_JS)/template.js
	bash -c "node $(BUILD)/app.js"

clean:
	@rm -Rf $(BUILD)/*
