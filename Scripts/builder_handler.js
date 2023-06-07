var builder_configuration_template = '{"element_id":"","element_type":"","builder_configuration":[]}';
var builder_configuration_level = '{"configuration_variables":[],"level":""}';
var builder_configuration_variable = '{"name":"","pseudonim":"","validating_expression_input":"","input_type":"","custom_html":"","custom_code":"","hide_variable":"","custom_value_load":""}';
var builder_configuration_category = '{"category_name":"","category_pseudonim":"", "hide_category":""}';
var parent_custom_function = '/*Your function must return a string value with the data to include in the profile*/';
var sequencer_rule_template = '{type:"",content:""}';
var builder_input_types = ['custom', 'direct'];
var current_builder_configuration;
var available_variables = [];
var temporal_level_data;
var available_parents = [];
var available_objects = [];
var sequencer_existing_rules = [];
var consumption_guide;

function builderInitialization() {

    from = "Builder: ";
    console.log(from + "builder initialization");
    sequencer_existing_rules.length = 0;
    //check if the selected_element global variable has, indeed, assign values to identify the content to edit
    if (element_to_edit.element_id != null) {
        //there was a previous selection 
        console.log(from + ' found previous selection');
        console.log("%cChecking previous selection for validity", "color:red");
        if (findProfilePlaceInStorage("profile", element_to_edit.element_id) == null) {

            console.log("%cRESETTING THE BUILDER: The previous element was invalid", "color:red;");
            document.getElementById("available_parents").innerHTML = '';
            document.getElementById("available_children").innerHTML = '';
            document.getElementById("available_children_variables").innerHTML = '';


            //We reset the diagrams
            reasonerPlantumlDiagram();
            this.temporal_level_data = [];
            this.available_parents = [];
            return;
        }

        alertify.notify('Element selected: ' + element_to_edit.element_name, 'success', 2);
        builderConfigurationInitializer();

        document.getElementById('currently_selected_profile').innerHTML = '';
        document.getElementById('currently_selected_profile').innerHTML += element_to_edit.element_name;

        //gotta get the code for the algorithm ready!!
        builder_algorithm_editor.setValue(this.db.builder_algorithm);
        sequencerRulesReasoner(this.available_parents);
        runBuilderAlgorithm();

    } else {
        console.log(from + "previous selection not found, offering a selection");
        //toggle the modal
        //I gave in to the temptation of using jquery for this
        $('#builder_element_selection_modal').modal('show');
    }
}

function prepareConfigurationForUi() {
    from = 'prepareConfigurationForUi: ';
    if (this.available_parents.length == 0) {

        //we need to check if there is an existing cache for the profile. If there is an existing cache for the profile, we just have to load it into the global this.available_parents variable. If it does not exist, we then proceed to dissectToObjects()
        console.log("WE ARE EDITING THE PROFILE: " + element_to_edit.element_name);
        let place_in_storage = findProfilePlaceInStorage("profile", element_to_edit.element_id);

        if (db.profile_Array[place_in_storage].hasOwnProperty("profile_cache")) {
            //if the property exists then there is surely populated, otherwise it would not exist
            let stored_cache = JSON.parse(db.profile_Array[place_in_storage].profile_cache);
            //guess what!!! we also have to check if the schema has changed, therefore, we need to compare what is stored in the cache to the real dissection of he object
            //BUT WHAT IF THERE ARE VALUES STORED IN THE CACHE BECAUSE IT IS THE CACHE
            //this obviously means that we have to compare just the amount of variables and categories in order to know if something 

            //TODO: deal with the changes in the schema...

            this.available_parents = stored_cache.valueOf();
            console.log("prepareConfigurationForUi: %c there was an existing cache found for the curring profile, it is now loaded.", "color:#4287f5");

        } else {
            dissectToObjects(element_to_edit.element_content, this.available_parents);
            from = 'prepareConfigurationForUi: ';
            console.log(from + " configuration ready, initializing UI");
        }

        fillBuilderUi();
        reasonerPlantumlDiagram('sequence');
        reasonerPlantumlDiagram('timing');
    } else {
        let place_in_storage = findProfilePlaceInStorage("profile", element_to_edit.element_id);
        if (db.profile_Array[place_in_storage].hasOwnProperty("profile_cache")) {
            //if the property exists then there is surely populated, otherwise it would not exist
            let stored_cache = JSON.parse(db.profile_Array[place_in_storage].profile_cache);
            //guess what!!! we also have to check if the schema has changed, therefore, we need to compare what is stored in the cache to the real dissection of he object
            //BUT WHAT IF THERE ARE VALUES STORED IN THE CACHE BECAUSE IT IS THE CACHE
            //this obviously means that we have to compare just the amount of variables and categories in order to know if something 

            //TODO: deal with the changes in the schema...
            this.available_parents.length = 0;
            this.available_parents = stored_cache.valueOf();
            console.log("prepareConfigurationForUi: %c there was an existing cache found for the curring profile, it is now loaded.", "color:#4287f5");

        } else {
            this.available_parents = [];
            dissectToObjects(element_to_edit.element_content, this.available_parents);
            from = 'prepareConfigurationForUi: ';
            console.log(from + " configuration ready, initializing UI");
        }

        //the memory is ready, passing the task of presenting it in the front end to the ui_handler
        fillBuilderUi();
        reasonerPlantumlDiagram('sequence');

    }


}


function setBuilderSelection(type, selectionid) {
    cleanAllLines();
    $('#builder_element_selection_modal').modal('hide');
    this.element_id= new Object();
    Object.assign(this.element_to_edit, db[type + "_Array"][findProfilePlaceInStorage(type, selectionid)]);//copy the object
    //get the consumption guide and assign it to the global variable
    if(this.element_to_edit.hasOwnProperty('consumption_guide')){
    this.consumption_guide = JSON.parse(db.profile_Array[findProfilePlaceInStorage('profile', this.element_to_edit.consumption_guide)].profile_cache);
    }

    console.log(from + " selected " + this.element_to_edit.element_id);
    alertify.notify('Element selected: ' + this.element_to_edit.element_name, 'success', 2);
    this.available_parents.length = 0;
    builderInitialization();
    //INITIALIZE THE GUIDE
    populateGuides();
    
}

function builderConfigurationInitializer() {
    //This is a really important part of the builder. The purpose of this function is to get all the arrays, objects and variables, and assign a layout to the ui based on its configuration
    let selected_level = document.getElementById('builder_level_selection').value;
    //check if a configuration for the selected layout exists
    let configuration_checker = builderConfigExists(selected_level); //this function checks if there is available configuration for the profile at all and, if there is, if there is available configuration for the current level

    //if the config for the current profile does not exist, we build it
    if (configuration_checker.found_config == false) {
        console.log("builderArtifactInterpret: No previous configuration found, building it.");
        var config_index = builderCreateConfig();//configuration from template takes place here
        console.log("builderArtifactInterpret: default configuration template assigned");
    }

    //here there must be a config, we now have to deal with the level
    configuration_checker = builderConfigExists(selected_level);

    if (configuration_checker.found_level == false) {
        config_index = findConfigIndex();
        builderCreateLevel(config_index, selected_level);
    }

    configuration_checker = builderConfigExists(selected_level);

    let db_object_index = findLevelIndex(selected_level);
    //console.log("builderAritfactInterpret: index of the current level: " + JSON.stringify(db_object_index));
    var current_level = db.builderConfigurations[db_object_index.builder_configuration_index].builder_configuration[db_object_index.inner_level_index];
    //we check the current level for initialization
    //initializeBuilderConfiguration
    if (current_level.configuration_variables.length == 0) {
        console.log("builderArtifactInterpret: configuration available but not initialized");

        alertify.confirm("A configuration for this profile and level exists but it is not initialized. would you like to teach the tool how to use it?", function (e) {
            if (e) {

                this.temporal_level_data = [...current_level.configuration_variables];
                console.log("The initialization will be saved to: " + JSON.stringify(current_level.configuration_variables));
                console.log('builderConfigurationInitializer: temporal_level_data: ' + JSON.stringify(this.temporal_level_data));
                teachConfiguration(current_level);
            }
        });
    } else {
        this.temporal_level_data = current_level.configuration_variables;
        prepareConfigurationForUi();
    }

}


function builderConfigExists(val) {
    //this function is meant to know if there is a configuration for the instance selected
    let found_config = false;
    let found_level = false;
    let result = { found_config, found_level };

    for (i in db.builderConfigurations) {
        if (db.builderConfigurations[i].element_id == element_to_edit.element_id) {

            result.found_config = true;
            for (x in db.builderConfigurations[i].builder_configuration) {

                if (db.builderConfigurations[i].builder_configuration[x].level == val) {
                    result.found_level = true;
                    break;
                }
            }
            break;
        }
    }

    return result;
}

function findLevelIndex(selected_level) {

    let builder_configuration_index;
    let inner_level_index;
    for (let i in db.builderConfigurations) {
        if (db.builderConfigurations[i].element_id == element_to_edit.element_id) {

            for (let x in db.builderConfigurations[i].builder_configuration) {
                console.log("found level: " + db.builderConfigurations[i].builder_configuration[x].level);
                if (db.builderConfigurations[i].builder_configuration[x].level == selected_level) {
                    inner_level_index = x;
                    break;
                }
            }
            builder_configuration_index = i;
            break;
        }
    }
    let result = { builder_configuration_index, inner_level_index };
    return result;
}

function findConfigIndex() {
    let found_index;
    for (i in db.builderConfigurations) {
        if (db.builderConfigurations[i].element_id == element_to_edit.element_id) {


            found_index = i;
            break;
        }
    }
    return found_index;
}

function findConfigIndexById(element_id) {
    let found_index;
    for (i in db.builderConfigurations) {
        if (db.builderConfigurations[i].element_id == element_id) {


            found_index = i;
            break;
        }
    }
    return found_index;
}

function builderCreateConfig() {
    from = "builderCreateConfig: ";
    console.log(from + " creating configuration");
    let new_config = JSON.parse(builder_configuration_template);
    new_config.element_id = this.element_to_edit.element_id.valueOf();
    new_config.element_type = this.element_to_edit.element_type.valueOf();
    //we have a conflict here because .buildingConfiguration is now an ARRAY, this means that we need to sort out WHERE we will place the
    console.log(from + "Default configuration instance created: " + JSON.stringify(new_config));
    //we save the current config in memory to the global variable 
    this.current_builder_configuration = new_config.builder_configuration;
    saveToStorage('builder_config', new_config, false);
    //we get the index of the configuration
    return findConfigIndex();

}

function builderCreateLevel(config_index, selected_level) {
    from = 'builderCreateLevel: ';
    console.log(from + "creating a level");
    let level = JSON.parse(this.builder_configuration_level);
    level.level = selected_level;
    console.log(config_index);
    db.builderConfigurations[config_index].builder_configuration.push(level);
    console.log(from + " level created: " + selected_level);
    updateLocalStorage();



}

function teachConfiguration(current_level) {
    current_level == null ? findConfigurationVariables() : current_level;
    from = "teachConfiguration: ";
    console.log(from + "%c class begins..", "color:#4287f5 ");
    console.log("teachConfiguration: found configuration variables: " + current_level);
    //we first build an object with the variables of the schema or, better said, the "content of the profile"
    //let profile_variables = fetchVariables(element_to_edit.element_content);
    this.available_variables.length = 0;
    fetchVariablesWithoutParent(element_to_edit.element_content, '');
    if (checkDuplicatedVariables()) {
        let transitive_array = this.available_variables.slice();
        let result = treatDuplicatedVariables(transitive_array);
        this.available_variables = result.slice();
        //we have to consider as well if there is an existing configuration for this level
        $("#teaching_modal").modal("show");
        buildTeacherUI(this.temporal_level_data);

    } else {
        console.log("teachConfiguration: variables to learn: " + this.available_variables);
        //we have to consider as well if there is an existing configuration for this level
        $("#teaching_modal").modal("show");
        buildTeacherUI();
    }



}

function treatDuplicatedVariables(array) {
    return Array.from(new Set(array));
}

function checkDuplicatedVariables() {
    from = "checkDuplicatedVariables: ";
    let copy1 = this.available_variables.slice();
    let copy2 = this.available_variables.slice();
    let amount = 0;
    for (let i in copy1) {
        for (let x in copy2) {

            if (x !== i) {
                if (copy1[i] == copy2[x]) {
                    return true;

                }
            }


        }
    }
    return false;

}

function fetchFirstLevelVariables(obj) {
    from = "fetchFirstLevelVariables: ";
    console.log(from + "fetching variables of object: " + JSON.stringify(obj));
    let variables = [];
    if (typeof obj == 'object') {
        const entries = Object.entries(obj);
        for (let i = 0; i < entries.length; i++) {
            const key = entries[i][0];
            const val = entries[i][1];
            const isRootElement = initialObj.hasOwnProperty(key);
            if ((typeof val === 'string' || typeof val === 'number') && !Array.isArray(val)) {
                variables.push(key);
            }
        }

    } else if (Array.isArray(obj)) {
        for (let x in obj) {
            if ((typeof obj[x] === 'string' || typeof obj[x] === 'number')) {
                variables.push(x);
            }


        }
    }
    console.log(from + " FOUND VARIABLES: " + variables);
    return variables;
}

function fetchVariablesWithoutParent(obj, parentK = '') {
    initialObj = this.available_variables.length === 0 ? obj : initialObj;
    const entries = Object.entries(obj);
    for (let i = 0; i < entries.length; i++) {
        const key = entries[i][0];
        const val = entries[i][1];
        const isRootElement = initialObj.hasOwnProperty(key);
        parentK = isRootElement ? key : key;
        if ((typeof val === 'string' || typeof val === 'number') && !Array.isArray(val)) {
            this.available_variables.push(parentK);
        }
        if ((typeof val === 'object' || Array.isArray(val)) && val !== null) {
            fetchVariablesWithoutParent(val, parentK);
        }
    }
}

function dissectToObjects(obj, target) {

    from = 'dissecToObjects: ';
    let temporal_element = JSON.parse(JSON.stringify(obj));
    dismemberObject(temporal_element, ''); //this function gets every object and array and separes it from the nesting, creating a group of objects and putting them into this.available.objects
    let result = backtrackParents(target);//this function matches the single objects to their parents so that, when we finish building the profile, we can save it and generate a JSON representative of the original schema
    from = 'dissectToObjects:';
    console.log(from + " hierarchy established");


    function dismemberObject(obj) {
        if (typeof obj === 'object' && !Array.isArray(obj)) {//we check that the input is an object
            let key = Object.keys(obj);
            for (let x in key) {

                let name = key[x];//the name
                let value = obj[key[x]];//the value
                console.log("%cThe current value of " + key[x] + " is an array: " + Array.isArray(obj[key[x]]) + "\n whose value is : " + JSON.stringify(value), 'color:#f5edab');
                if (typeof value === 'object' && !Array.isArray(value)) { //we check if the value of the current entry is an object
                    //if(name !== 0){
                    console.log("%c - Pushing an object into available parents in index: " + target.length, "color:#4287f5");
                    target.push([name.split("-").join("_"), JSON.parse(JSON.stringify(value).split("-").join("_")), 'object', '', []]);//if it is an object, we store it in the available_parents with its contents inside
                    //console.log("deleting: "+name);
                    delete obj[name];//we delete the object that we just entered into in order to avoid its repetition
                    dismemberObject(value);//we repeat the process with the value of the current entry
                    //}

                } else if (Array.isArray(value)) {
                    for (let i in obj) {//this will surely be almost always 1
                        for (let x in obj[i]) {//<- this shit here sets the name of the damn property inside
                            //this has to work differently as it is an array not an object
                            //the sort is then this way:
                            //console.log("inner:"+i);
                            let name = i;
                            let value = obj[i][x];
                            if (Array.isArray(value)) {
                                dismemberObject(value, '');
                            } else {
                                console.log("%c - Pushing an %cArray %cinto available parents in index: " + target.length, "color:#4287f5", "color:#f5edab", "color:#4287f5");
                                console.log("%cThe parent: " + name.split("-").join("_") + "\nThe contents:\n" + JSON.stringify(value) + "", "color:#f5edab");
                                target.push([name.split("-").join("_"), JSON.parse(JSON.stringify(value).split("-").join("_")), 'array', '', []]);
                                console.log(JSON.stringify(target));
                                console.dir(JSON.parse(JSON.stringify(value)));
                                /* console.log("%cThe contents of value: "+JSON.stringify(value),"color:#f5edab");
                                console.log("%cThe contents of obj: "+JSON.stringify(obj),"color:#f5edab");
                                console.log("%cThe contents of obj[i]: "+JSON.stringify(obj[i]),"color:#f5edab"); */

                                if (typeof obj[i] == 'object') {
                                    console.log("ITS AN OBJECT, MAN!");
                                }
                                console.log("THE VALUE OF X " + x);
                                obj[i].splice(x, 1);//the problem is this is not an array anymore!!!! it is an object

                                console.log("The contents of obj[i] AFTER SPLICE: " + JSON.stringify(obj[i]));
                                console.log("The contents of obj AFTER SPLICE:" + JSON.stringify(obj));
                                dismemberObject(value, '');
                            }

                        }
                    }
                }
            }
        } else {
            console.log(JSON.stringify(obj) + " WAS ACTUALLY AN ARRAY");
        }

    }
    function backtrackParents(array) {
        from = "backtrackParents: ";
        //obj is an array of arrays that also has objects inside
        //structure of the content: 0= name, 1=content 2= type 3= parent
        //console.log(from+" building relationships between "+array.length+" elements");
        for (var i = (array.length - 1); i >= 0; i--) {
            //console.log("current array member: index: "+i+" out of :"+array.length+" content: "+array[i]);
            var target_name = array[i][0];
            var target_content = array[i][1];
            var target_type = array[i][2];
            var target_parent = array[i][3];
            if (i == 0) {
                array[i][3] = 'root';
                break;
            }
            for (var x = (i - 1); x >= 0; x--) {
                let source_name = array[x][0];
                var source_content = array[x][1];
                let source_type = array[x][2];
                let source_parent = array[x][3];
                //console.log(from+"Looking for "+target_name+" in "+source_name);
                let is_parent = isParent(source_content, target_name);
                if (is_parent == true) {
                    //console.log(from+" "+target_name+" is child of  "+source_name);
                    //we now link the child to the parent
                    array[i][3] = x;
                    delete source_content[target_name];
                    break;
                } else {
                    //console.log(from+" "+target_name+" is not a child of  "+source_name);
                    array[i][3] = 'root';
                }
            }

        }

        return array;

    }
}

function deleteFromParent(parent_object, target_name) {
    console.log("deleting key " + target_name);
    const entries = Object.entries(parent_object);
    var found = false;

    for (let i = 0; i < entries.length; i++) {
        const key = entries[i][0];
        const val = entries[i][1];
        const isRootElement = parent_object.hasOwnProperty(key);
        parentK = isRootElement ? key : key;

        if ((typeof val === 'object' || Array.isArray(val)) && key == target_name) {
            console.log("deleting key " + key);
            delete parent_object[key];
            break;
        } else if ((typeof val === 'object' || Array.isArray(val) && key != target_name)) {
            isParent(val, target_name);
        }
    }
}



function isParent(obj, target = '') {
    initialObj = this.available_variables.length === 0 ? obj : initialObj;
    const entries = Object.entries(obj);
    var found = false;
    for (let i = 0; i < entries.length; i++) {
        const key = entries[i][0];
        const val = entries[i][1];
        const isRootElement = initialObj.hasOwnProperty(key);
        parentK = isRootElement ? key : key;

        if ((typeof val === 'object' || Array.isArray(val)) && key == target) {
            found = true;
            break;
        } else if ((typeof val === 'object' || Array.isArray(val) && key != target)) {
            isParent(val, target);
        }
    }
    return found;
}

function copyArray(source, target) {
    for (let i in source) {
        target.push(i.valueOf());
    }
}


function readVariablesConfigurationFromUi() {
    from = "readVariablesConfigurationFromUi: ";
    //we need to check here if there is existing data for the current available_variable. If there is available data, we should change its data instead of pushing the configuration to store. 


    if (this.temporal_level_data != null) {
        if (this.temporal_level_data.length != 0) {
            let new_variable_configuration = JSON.parse(builder_configuration_variable);
            let names = Object.keys(new_variable_configuration);
            for (let i in this.available_variables) {
                for (let x in names) {
                    try {
                        new_variable_configuration = recollectVariableFromTeacher(i);
                        if (this.temporal_level_data[i][names[x]] !== new_variable_configuration[names[x]].valueOf()) {
                            this.temporal_level_data[i][names[x]] = new_variable_configuration[names[x]].valueOf();
                        }

                    } catch (error) {
                        console.log(from + "there was an OOPSIE with a variable but we can skip it");
                    }
                }


                //now that we have read the variables for the teacher, we have to place the current values of the categories in their corresponding places.

                //fetch the unique parents
                let filter = new Map();
                for (let x in this.available_parents) {
                    filter.set(this.available_parents[x][0], '');
                }

                //now that we have the unique parent's names, it is time to add each value of them to the ui

                let iterator = filter.keys();
                let current_value = iterator.next();
                let category_configuration = JSON.parse(builder_configuration_category);
                //category_configuration is now our prototype object
                let category_configuration_keys = Object.keys(category_configuration);
                //category_configuration_keys now has the data of the available properties of the object used for the configuration
                // we can fetch the current values of the Ui

                //we have to scroll the temporal level data in order to update it
                for (let x in this.temporal_level_data) {
                    if (this.temporal_level_data[x].hasOwnProperty('category_name')) {
                        //this place in the temporal level data belongs to a category, we can search it.
                        //we get the current data in the UI
                        let recollected_category = recollectCategoryFromTeacher(this.temporal_level_data[x].category_name);

                        //we now check each of the values and save the new ones.
                        for (let y in category_configuration_keys) {
                            if (recollected_category[category_configuration_keys[y]].valueOf() !== this.temporal_level_data[x][category_configuration_keys[y]]) {

                                console.log("%readVariablesConfigurationFromUi: The property " + category_configuration_keys[y] + ' changed from: ' + temporal_level_data[x][category_configuration_keys[y]].valueOf() + " to: " + recollected_category[category_configuration_keys[y]]);

                                this.temporal_level_data[x][category_configuration_keys[y]] = recollected_category[category_configuration_keys[y]].valueOf();
                            }
                        }

                    }
                }




            }



            console.log(from + "%cexisting configuration written with the new data per variable", 'color:#4287f5');
            alertify.notify("Level's data updated succesfully", 'success', 2);

            let configuration_to_save_to = findConfigurationVariables();

            configuration_to_save_to.configuration_variables = [...this.temporal_level_data];
            console.log("readVariablesConfigurationFromUi: %cthe following information was written to the configuration's database: ", 'color: #4287f5');
            //console.log(configuration_to_save_to.configuration_variables);

            updateLocalStorage();
            prepareConfigurationForUi();
        }

    } else {

        //there is no existing data for the configuration, therefore, we have to build it
        for (let i in this.available_variables) {
            //console.log(from+"building the variable configuration for: "+this.available_variables[i]);
            let new_variable_configuration = recollectVariableFromTeacher(i, true);
            if (this.temporal_level_data == null) {
                this.temporal_level_data = [];
            }

            this.temporal_level_data.push(new_variable_configuration);

        }

        let categories = new Map();

        for (let x in this.available_parents) {
            categories.set(this.available_parents[x][0], '');
        }

        //now that we have unique categories names, we can build a configuration for each one
        let iterator = categories.keys();
        let current_category = iterator.next();

        while (!current_category.done) {
            let category_name = current_category.value;
            let new_category_configuration = recollectCategoryFromTeacher(category_name);
            this.temporal_level_data.push(new_category_configuration);
            current_category = iterator.next();
        }

        alertify.notify("Level's data created succesfully", 'success', 2);
        //we have to push the level to the DB in order to get it stored :)
        let configuration_to_save_to = findConfigurationVariables();

        if (configuration_to_save_to != null) {
            //console.log("readVariablesConfigurationFromUi: Storing configuration to: "+JSON.stringify(configuration_to_save_to));

            configuration_to_save_to.configuration_variables = [...this.temporal_level_data];

            //console.log("readVariablesConfigurationFromUi: %the following information was written to the configuration's database: ",'color: #4287f5');
            //console.log(configuration_to_save_to.configuration_variables);
            updateLocalStorage();
            prepareConfigurationForUi();
            fillBuilderUi();
            alertify.success('Configuration for the current level learnt.');
        } else {
            alertify.error('No builder configuration exists for this level (er02)');
        }



    }

    $("#teaching_modal").modal('hide');

    function recollectVariableFromTeacher(i) {

        //flag: recollect the data for the categories

        let new_variable_configuration;
        new_variable_configuration = JSON.parse(builder_configuration_variable);

        new_variable_configuration.name = this.available_variables[i];
        new_variable_configuration.pseudonim = document.getElementById(this.available_variables[i] + '_pseudonim').value.split(' ').join('_');
        new_variable_configuration.validating_expression_input = document.getElementById(this.available_variables[i] + '_validating_expression_input').value;
        new_variable_configuration.input_type = document.getElementById(this.available_variables[i] + '_input_type').value;
        new_variable_configuration.custom_html = document.getElementById(this.available_variables[i] + '_custom_html').value;
        new_variable_configuration.custom_code = document.getElementById(this.available_variables[i] + '_custom_code').value;
        new_variable_configuration.custom_value_load = document.getElementById(this.available_variables[i] + '_custom_value_load').value;
        new_variable_configuration.hide_variable = document.getElementById(this.available_variables[i] + '_hide_variable').checked;
        new_variable_configuration.hide_variable = document.getElementById(this.available_variables[i] + '_hide_variable').checked;

        //saveCustomFunctions(new_variable_configuration.custom_code);


        return new_variable_configuration;
    }

    function recollectCategoryFromTeacher(category_name) {
        //flag: I was going to create a function that recollects the values for the categories


        let new_category_configurations = JSON.parse(builder_configuration_category);
        new_category_configurations.hide_category = document.getElementById(category_name + '_hide_category').checked;

        new_category_configurations.category_pseudonim = document.getElementById(category_name + '_category_pseudonim').value.split(' ').join('_');

        new_category_configurations.category_name = category_name;

        return new_category_configurations;
    }
}

function saveCustomFunctions(content) {
    //we separate the functions into elements of an map in order to filter possible duplicates
    let keep_going = true;
    this.db.custom_functions;
    while (keep_going) {
        if (content.includes('~')) {
            //there is a function openning or closing
            let start_function = content.indexOf('~');
            content.split(content.indexOf('~')).join('');
            let finish_function = content.indexOf('~');
            let new_function = content.substring(start_function, finish_function - 1);
            console.log("saving custom function: " + new_function);
            this.db.customFunctions.set('function', new_function);


        } else {
            keep_going = false;
        }
    }





}
function addInstance(place_in_available_parents) {
    from = "addInstance: ";
    //first we need to fetch the variables of the thing to instance
    let content = JSON.parse(JSON.stringify(this.available_parents[place_in_available_parents][1]));
    console.log(from + "content to instance: " + JSON.stringify(content));

    let root_variables = Object.keys(content);

    console.log(from + "root variables for the element: " + root_variables);

    var parent_chain = [];
    let current_parent = this.available_parents[place_in_available_parents][3];
    //here we have to check that a hierarchy of instances exists to properly instance the content somewhere
    if (current_parent !== "root") {
        console.log(from + "checking the hierarchy of parent elements");
        parent_chain.push(current_parent);
        parent_chain = getParentChain(place_in_available_parents, parent_chain);
        console.log(from + "Hierarchy found: " + parent_chain);
    }



}

function getParentChain(starting_element, parent_chain) {

    if (starting_element !== 'root') {
        let target_parent = this.available_parents[starting_element][3];
        for (let i = target_parent; i < this.available_parents.length; i++) {
            if (i == target_parent) {
                console.log('next parent: ' + this.available_parents[i][3]);
                if (this.available_parents[i][3] !== 'root') {
                    parent_chain.push(this.available_parents[i][3]);
                }

                console.log("parent chain: " + parent_chain);
                getParentChain(this.available_parents[i][3], parent_chain);

            }
        }

    } else {
        console.log(from + "I bumped into a root while digging!");
    }
    return parent_chain;

}

function getChildrenChain(starting_element, children_chain) {

    for (let i = starting_element; i < this.available_parents.length; i++) {
        //we check if the parent of the element i is equal to the starting element

        if (this.available_parents[i][3] == starting_element) {

            children_chain.push(i);
            //now that we have the first child, we have to continue the child chain search
            getChildrenChain(i, children_chain);

        }
    }

    return children_chain;
}


function saveRawPropertyValue(parent_index, input_id, property_name, is_variable_subset, is_instance, type, instance_id, is_custom, subset_name, custom_value) {
    console.log("saveRawPropertyValue<Value received: " + custom_value + "instance id: " + instance_id + ">");
   
    if (!is_instance) {
        let input_value
        if (is_custom) {
            input_value = custom_value;
        } else {
            input_value = document.getElementById(property_name + '_value_field_' + input_id).value;
        }

        let properties = this.available_parents[parent_index][1];
        properties[property_name] = input_value.valueOf();//javscript is so cool we can diretly reference an object's property using a string. :) I LOVE IT!
        alertify.success('Succesfully saved the new value for ' + property_name.split('_').join(' '));
        
        //if something changes, we have to alert the user to run the algorithm again

        let run_algorithm_button = document.getElementById('run_algorithm_button');
        run_algorithm_button.classList.add('attention');

        playSound("Success_2");
        saveInstanceCache();


    } else {
        let input_value;
        if (is_custom) {

             //if something changes, we have to alert the user to run the algorithm again

        let run_algorithm_button = document.getElementById('run_algorithm_button');
        run_algorithm_button.classList.add('attention');
            input_value = custom_value;
            //if there is a custom value, there could also be a custom subset name. We have to get the original subset name to properly save the value to the correct sub-set.
            //I have to enter the configuration to find if a subset has the same name as the subset name received by this function
            //If I find a match between a custom name and the current name, I have to set the 'subset_name' variable's value to the original name of the subset.
            //1- get the applicable configuration
            for (let x in db.builderConfigurations) {
                if (db.builderConfigurations[x].element_id == this.element_to_edit.element_id) {
                    //2- Get the applicable level
                    console.log("%cProfile found", 'color: red;');
                    let configuration = db.builderConfigurations[x];
                    for (let y in configuration.builder_configuration) {
                        //get the level, we can get it directly from the selector
                        let selected_level = document.getElementById('builder_level_selection').value;
                        if (configuration.builder_configuration[y].level == selected_level) {

                            console.log("%cConfiguration level found", 'color: red;');
                            let configuration_level = configuration.builder_configuration[y];
                            //3- now that we are in the right level, grab all the subsets.
                            let subset_places = [];
                            for (let z in configuration_level.configuration_variables) {
                                configuration_level.configuration_variables[z].hasOwnProperty('category_name') ? subset_places.push(z) : null;
                            }

                            console.log("%cSubsets found: " + subset_places, 'color: red;');
                            //4- now that we have all the subsets, we can check one by one if the 'custom_name' matches the 'subset_name'. If it is a match, we swap the 'subset_name's value for the value of 'category_name'
                            let configurations_variables = configuration_level.configuration_variables;
                            for (let A in subset_places) {

                                if (configurations_variables[subset_places[A]].category_pseudonim == subset_name) {
                                    //5- Assign the 'true' subset name to the 'subset_name'
                                    console.log("%cOriginal subset name found: " + configurations_variables[A].category_name, 'color: red;');
                                    subset_name = configurations_variables[subset_places[A]].category_name;
                                    //We are done, if there is no category pseudonim matching the subset_name, there is no need to reset any value
                                }
                            }

                        }
                    }
                }
            }


        } else {
            input_value = document.getElementById(property_name + '_value_field_' + input_id).value;
        }
        //because it is a value within an instance, we have to fetch the actual instance 
        //console.log("checking parent index: " + parent_index);
        let available_instances = this.available_parents[parent_index][4];// the array of inner instances

        for (let x in available_instances) {
            //console.log("checking instance " + available_instances[x].inner_id + " against " + instance_id);

            if (available_instances[x].inner_id == instance_id) {

                //we are simply not saving the value where we should!
                //console.log("is a variables sub-set? " + is_variable_subset);
                if (is_variable_subset) {
                    //we have to get the appropiate variable subset
                    let variables_array = available_instances[x].inner_variables;
                    let found_Subset = false;
                    for (let y in variables_array) {
                        //console.log(variables_array[y]);
                        //console.log("Looking for : "+subset_name);
                        if (variables_array[y].name == subset_name) {
                            //console.log("found subset " + variables_array[y].variables);
                            variables_array[y].variables[property_name] = input_value;
                            playSound('Success_2');
                            alertify.success('Succesfully saved the new value for ' + property_name.split('_').join(' '));
                            saveInstanceCache();
                            break;
                        }
                    }
                } else {
                    //we now substitute the value of the correct variable
                    let variables = available_instances[x].inner_variables;
                    for (let y in variables) {

                        //console.log("saveRawPropertyValue: found instance: " + available_instances[x].inner_id + " in " + JSON.stringify(variables[y].variables));
                        variables[y].variables[property_name] = input_value;
                        //console.log("saveRawPropertyValue: new value for " + property_name + ' in instance ' + available_instances[x].inner_id + ' subset: ' + variables[y].name + ' value: ' + variables[y].variables[property_name]);

                        playSound('Success_2');
                        alertify.success('Succesfully saved the new value for ' + property_name.split('_').join(' '));
                        saveInstanceCache();
                        break;
                    }
                }

            } else {
                //console.log('%cNo instances found', 'color:red');
            }

        }


    }




}


function getPropertyMetadata(dom_source) {
    console.log("Fetching metadata: " + document.getElementById(dom_source).previousSibling.textContent);
    let source = JSON.parse(document.getElementById(dom_source).previousSibling.textContent);
    return source;
}
function savePropertyFromCustomConfiguration(parent_index, input_id, property_name, is_variable_subset, is_instance, type, instance_id, is_custom, subset_name) {

}

function createInstanceFromProfileElement(library_id, dom_target, parent_index, self_index, is_parent, is_instance, parent_id, parent_instance_id) {

    let new_instance = {};
    new_instance["inner_id"] = Date.now();
    new_instance["Name"] = "Add a name with the pencil icon";
    new_instance["parent_id"] = self_index.valueOf();
    new_instance["parent_instance_id"] = parent_instance_id;
    new_instance["inner_variables"] = [];

    //the structure for the inner variables should be this
    // {'level':'root','variables: 'bla bla'}

    //we have to populate the new instance with the sub-sets of variables because those are not instanced
    let children = [];
    children = getChildrenChain(self_index, children);
    console.log("Getting the variable sub-sets for the instance " + new_instance.inner_id + ", available children: " + children);
    let new_root_variables = {};
    new_instance.inner_variables.push({ 'name': 'root', 'variables': Object.assign(new_root_variables, this.available_parents[self_index][1]) });


    if (children.length > 0) {
        for (let x in children) {
            //check that the thing we are about to push into the inner variables is an object and that the parent is indeed the parent it should be
            if (this.available_parents[children[x]][2] == 'object' && this.available_parents[children[x]][3] == self_index) {
                let new_root_variables = {};
                new_instance.inner_variables.push({ 'name': this.available_parents[children[x]][0], 'variables': Object.assign(new_root_variables, this.available_parents[children[x]][1]) });
            }

        }
    }

    console.log("Inner variables assigned: " + JSON.stringify(new_instance.inner_variables));
    this.available_parents[self_index][4].push(new_instance);
    alertify.success("New " + this.available_parents[self_index][0] + " created: " + new_instance.Name);

    //we now populate the accordion with the available instances of the library
    if (!is_parent) {
        console.log("Created instance, not a parent.");
        //ibrary_name,dom_target,parent_index,self_index,is_parent,instanceable,instance_id
        playSound('Success');
        if (library_id != '') {
            populateInstanceLibrary(library_id, library_id + '_accordion_children', self_index, self_index, true, true, parent_instance_id);
        }

    } else {
        if (is_instance) {
            console.log("Created instance from parent, is instance");
            playSound('Success');
            if (library_id != '') {
                populateInstanceLibrary(library_id, library_id + '_accordion_children', parent_index, self_index, is_parent);
            }
        } else {
            console.log("Created instance from parent, is not an instance");
            playSound('Success');
            if (library_id != '') {
                populateInstanceLibrary(library_id, 'available_children', parent_index, self_index, is_parent);
            }
        }

    }

    saveInstanceCache();
    updateLocalStorage();
    sequencerRulesReasoner();
}
//inner variables es un array con objetos dentro

function getRootVariablesOfInstance(instance) {

    let root = [];
    for (let x in instance.inner_variables) {
        console.log("getRootVariablesOfInstance: " + instance.inner_variables[x].name);
        if (instance.inner_variables[x].name == 'root') {
            //I am putting this inside of an array just to keep the same format as the 
            //getSubSetVariablesOfInstance()
            root.push(instance.inner_variables[x]);
            return root;
        }
    }
}

function getSubSetVariablesOfInstance(instance) {
    let subsets = [];
    for (let x in instance.inner_variables) {
        if (instance.inner_variables[x].name != 'root') {
            console.log("subset name = " + instance.inner_variables[x].name);
            subsets.push(instance.inner_variables[x]);
        }
    }
    return subsets;
}

function getMatchingInstancesToParent(parent_instance_id, instances_array) {

    let instances = [];
    for (let x in instances_array) {
        console.log("Checking :" + instances_array[x].inner_id + " for parent " + parent_instance_id);
        if (instances_array[x].parent_instance_id == parent_instance_id) {
            let new_instance = {};
            Object.assign(new_instance, instances_array[x]);
            instances.push(new_instance);
        }
        // if(instance.inner_variables[x].name!='root'){
        //     console.log("subset name = "+instance.inner_variables[x].name);
        //     subsets.push(instance.inner_variables[x]);
        // }
    }
    console.log("Found instances : " + instances);
    return instances;

}

function executeCustomCode(dom_target) {
    try {
        let content = document.getElementById(dom_target).textContent;
        console.log("%c Executing custom code! ", "color:red;");
        eval(content);
    } catch (error) {
        alert("The following error was catched when trying to execute your custom code: " + error);
    }

}

function cancelLevelConfiguration() {
    prepareConfigurationForUi();
    console.log("%c Teacher cancelled", "color:red");
}

function getCategoryConfiguration(category_name) {

    for (let x in this.temporal_level_data) {
        if (this.temporal_level_data[x].hasOwnProperty('category_name')) {
            //we found a category name
            if (this.temporal_level_data[x].category_name == category_name) {
                return this.temporal_level_data[x];
            }
        }

    }

}

function findConfigurationVariables() {

    for (let x in db.builderConfigurations) {
        if (db.builderConfigurations[x].element_id == element_to_edit.element_id) {
            //we found the right element to edit
            //we now have to find the correct level for this configuration
            for (let y in db.builderConfigurations[x].builder_configuration) {
                if (db.builderConfigurations[x].builder_configuration[y].level == document.getElementById('builder_level_selection').value) {
                    console.log("findConfigurationVariables: level selected: " + document.getElementById('builder_level_selection').value + ' level found: ' + db.builderConfigurations[x].builder_configuration[y].level);
                    return db.builderConfigurations[x].builder_configuration[y];
                }

            }
        }
    }

    return null;
}

function saveRawInstanceEdition(dom_target, property_name, parent_index, instance_id) {
    let instance = findInstanceInStorage(parent_index, instance_id);
    let new_value = document.getElementById(dom_target).value;
    console.log("changing the property " + property_name + '  with value ' + instance[property_name] + ' to ' + new_value);
    instance[property_name] = new_value.valueOf();
    console.log("property value found: " + instance[property_name]);
    saveInstanceCache();
    updateLocalStorage();

}





function findInstanceIndexInStorage(parent_index, instance_id) {
    console.log("%cAttempting to find instance " + instance_id + " in " + parent_index, "color:#4287f5");
    for (let x in this.available_parents[parent_index][4]) {
        let current_instance = this.available_parents[parent_index][4][x];
        if (current_instance.inner_id == instance_id) {
            console.log("%c Found instance index: " + x, "color:#4287f5");
            return x;
        }
    }

    console.log("%c findInstanceIndexInStorage: there was an issue finding the instance in " + parent_index + "(maybe it is the wrong parent?)", "color:red");
    return null;
}

function deleteAllInstances() {
    for (let x in this.available_parents) {
        this.available_parents[x][4].length = 0;
    }
    saveInstanceCache();
    updateLocalStorage();
}

function deleteInstance(parent_index, self_index, id) {
    console.log("%cDeleting instance with parent: " + parent_index + " self index: " + self_index + " with id: " + id, "color:red");

    let instance_index = findInstanceIndexInStorage(self_index, id);
    if (instance_index != null) {
        this.available_parents[self_index][4].splice(instance_index, 1);
        //we gotta save the cache
        saveInstanceCache();
        alertify.success("Instance deleted successfully");
        fillBuilderUi();
        sequencerRulesReasoner();
        playSound('delete');
        return null;


    } else {
        instance_index = findInstanceIndexInStorage(parent_index, id);
        if (instance_index != null) {
            this.available_parents[parent_index][4].splice(instance_index, 1);
            //we gotta save the cache
            saveInstanceCache();
            alertify.success("Instance deleted successfully");
            fillBuilderUi();
            sequencerRulesReasoner();
            playSound('delete');
            return null;
        }

    }

    alertify.error("There was an error while deleting the instance.");


}

function runBuilderAlgorithm() {

    //we remove the shadow animation from the rate profile button
    let run_algorithm_button = document.getElementById('run_algorithm_button');
    run_algorithm_button.classList.remove('attention');

    saveToStorage('builder_algorithm');
    if(this.db.builder_algorithm!==null&&this.db.builder_algorithm!==''){
        try {
            eval(this.db.builder_algorithm);
        } catch (error) {
            console.log('There was an error attempting to execute the algorithm on startup: '+error);
        }
       
    }
    
}


function findPlaceByParentName(name, array) {

    for (let x in array) {
        if (array[x][0] == name) {
            return x;
        }
    }
    return null;//no place was found for the name
}

//------------------Sequencer related functions-----------

function sequencerRulesReasoner(array) {
    document.getElementById('results_sequencer_rules').innerHTML = '';
    document.getElementById('dependencies_sequencer_rules').innerHTML = '';
    document.getElementById('triggers_sequencer_rules').innerHTML = '';
    if (array == null) {
        array = this.available_parents;
    }




    populateResults();
    populateDependencies();
    populateTriggers();

    function populateResults() {
        let document_row = document.getElementById('results_sequencer_rules');
        //lets fetch the results

        let results_instances = array[findPlaceByParentName('Results', array)][4];
        //if it is a result we need 3 parameters: operation of origin, parameter to create and destination (if any)
        document_row.innerHTML += '<div class="col-12 rule  text-center content_box_option" style="margin-top:10px; background-color:#ffffff;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"><h6><strong>Source</strong></h6></div> <div class="col-3 no-gutters rule"><h6><strong>Parameter</strong></h6></div> <div class="col-3 no-gutters rule"> <h6><strong>Target</strong></h6> </div> <div class="col-3 no-gutters rule"><h6><strong>Actions</strong></h6></div> </div> </div> </div>'
        for (let x in results_instances) {
            let id = Date.now();
            id += Math.floor(Math.random() * 100);
            id += Math.floor(Math.random() * 100);

            document_row.innerHTML += '<div class="col-12 rule shadow-sm text-center content_box_option" style="margin-top:10px;padding-top:10px;padding-bottom:10px;padding-left:5px; background-color:linen;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"> <select class="form-select" aria-label="origin" id="' + id + '_origin"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" aria-label="parameter" id="' + id + '_parameter"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" aria-label="target" id="' + id + '_destination"> </select> </div> <div class="col-3 no-gutters rule"> <div class="row no-gutters rule text-center align-items-center"> <div class="col-6 rule"> <a class="instance_delete" style="margin-left:auto;margin-right:auto;" data-toggle="tooltip" data-placement="bottom" title="" onclick="deleteInstance(23,23,' + results_instances[x].inner_id + ',false,false)" data-bs-original-title="Delete instance "><strong>-</strong></a> </div> <div class="col-6 rule"> <img class="img-fluid align-middle" style="max-width: 30px;" src="./res/saveButton2.svg" onclick="saveSequence(23,' + results_instances[x].inner_id + ',' + id + ',' + "'" + 'result' + "'" + ')"></img> </div> </div> </div> </div> </div>';

            let document_result_origin = document.getElementById(id + '_origin');
            let document_result_parameter = document.getElementById(id + '_parameter');
            let document_result_destination = document.getElementById(id + '_destination');
            //we have to populate the selectors now with the possible operations and parameters
            //lets get the operations first 
            let current_instance_variables = results_instances[x].inner_variables[0];
            let available_operations = this.available_parents[findPlaceByParentName('Operations', this.available_parents)][4];
            let available_parameters = this.available_parents[findPlaceByParentName('Parameters', this.available_parents)][4];

            //lets add the origin
            for (let y in available_operations) {
                document_result_origin.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (results_instances[x].inner_variables[0].variables.source_operation == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
            }
            if (current_instance_variables.variables.source_operation == '') {
                document_result_origin.innerHTML += '<option value="" selected>None</option>';
            }

            //now lets add the destination
            for (let y in available_operations) {
                document_result_destination.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (results_instances[x].inner_variables[0].variables.target_operation == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
            }
            if (current_instance_variables.variables.target_operation == '') {
                document_result_destination.innerHTML += '<option value="" selected>None</option>';
            }

            //lets finish by adding the parameters
            for (let y in available_parameters) {
                document_result_parameter.innerHTML += '<option value=' + "'" + available_parameters[y].inner_id + "'" + (results_instances[x].inner_variables[0].variables.parameter == available_parameters[y].inner_id ? 'selected' : '') + '>' + available_parameters[y].Name + '</option>';
            }
            if (current_instance_variables.variables.parameter == '') {
                document_result_parameter.innerHTML += '<option value="" selected>None</option>';
            }

        }
    }
    function populateDependencies() {
        //dependencies are different because you have to choose a type of relationshinp, not an existing instance. We gotta be careful with this.
        let document_row = document.getElementById('dependencies_sequencer_rules');
        //lets fetch the results
        let dependencies_instances = array[findPlaceByParentName('Operational', array)][4];
        //if it is a result we need 3 parameters: operation of origin, parameter to create and destination (if any)
        document_row.innerHTML += '<div class="col-12 rule  text-center content_box_option" style="margin-top:10px; background-color:#ffffff;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"><h6><strong>Source</strong></h6></div> <div class="col-3 no-gutters rule"><h6><strong>Relationship\ntype</strong></h6></div> <div class="col-3 no-gutters rule"> <h6><strong>Target</strong></h6> </div> <div class="col-3 no-gutters rule"><h6><strong>Actions</strong></h6></div> </div> </div> </div>'
        for (let x in dependencies_instances) {
            let id = Date.now();
            id += Math.floor(Math.random() * 100);
            id += Math.floor(Math.random() * 100);

            document_row.innerHTML += '<div class="col-12 rule shadow-sm text-center content_box_option" style="margin-top:10px;padding-top:10px;padding-bottom:10px;padding-left:5px; background-color:linen;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"> <select class="form-select" aria-label="origin" id="' + id + '_origin"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" aria-label="parameter" id="' + id + '_parameter"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" aria-label="target" id="' + id + '_destination"> </select> </div> <div class="col-3 no-gutters rule"> <div class="row no-gutters rule text-center align-items-center"> <div class="col-6 rule"> <a class="instance_delete" style="margin-left:auto;margin-right:auto;" data-toggle="tooltip" data-placement="bottom" title="" onclick="deleteInstance(21,21,' + dependencies_instances[x].inner_id + ' ,false,false)" data-bs-original-title="Delete instance "><strong>-</strong></a> </div> <div class="col-6 rule"> <img class="img-fluid align-right" style="max-width: 30px;" src="./res/saveButton2.svg" onclick="saveSequence(21,' + dependencies_instances[x].inner_id + ',' + id + ',' + "'" + 'dependency' + "'" + ')"></img> </div> </div> </div> </div> </div>';

            var document_result_origin = document.getElementById(id + '_origin');
            var document_result_relationship_type = document.getElementById(id + '_parameter');
            var document_result_destination = document.getElementById(id + '_destination');

            //we have to populate the selectors now with the possible operations and parameters
            //lets get the operations first 
            let current_instance_variables = dependencies_instances[x].inner_variables[0];
            let available_operations = this.available_parents[findPlaceByParentName('Operations', this.available_parents)][4];
            let available_parameters = this.available_parents[findPlaceByParentName('Operational', this.available_parents)][4];
            //console.log("Operations found:\n " + JSON.stringify(available_operations) + "\nDependencies: \n" + JSON.stringify(available_parameters));
            //lets add the origin
            for (let y in available_operations) {
                document_result_origin.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (dependencies_instances[x].inner_variables[0].variables.source_operation_ID == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
            }
            // lets add a "none" option for when there is no selection available

            if (current_instance_variables.variables.source_operation_id == '') {
                document_result_origin.innerHTML += '<option value="" selected>None</option>';
            }

            //now lets add the destination
            for (let y in available_operations) {
                document_result_destination.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (dependencies_instances[x].inner_variables[0].variables.target_operation_ID == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
            }

            // lets add a "none" option for when there is no selection available

            if (current_instance_variables.variables.target_operation_ID == '') {
                document_result_destination.innerHTML += '<option value="" selected>None</option>';
            }


            //lets finish by adding the parameters
            document_result_relationship_type.innerHTML += '<option value="dependee">is depended on by</option><option value="dependant">depends on</option>'

            if (current_instance_variables.variables.operational_dependency_type == '') {
                document_result_relationship_type.innerHTML += '<option value="" selected>None</option>';
            } else {
                //we place the stored type
                document_result_relationship_type.value = current_instance_variables.variables.operational_dependency_type;
            }

        }
    }

    function populateTriggers() {
        //triggers are a bit tricky because we have to add listeners depending on the type of trigger we select
        let document_row = document.getElementById('triggers_sequencer_rules');
        //lets fetch the results
        let triggers_instances = array[findPlaceByParentName('Triggers', array)][4];
        //if it is a result we need 3 parameters: operation of origin, parameter to create and destination (if any)
        document_row.innerHTML += '<div class="col-12 rule  text-center content_box_option" style="margin-top:10px; background-color:#ffffff;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"><h6><strong>Source</strong></h6></div> <div class="col-3 no-gutters rule"><h6><strong>Trigger\ntype</strong></h6></div> <div class="col-3 no-gutters rule"> <h6><strong>Target</strong></h6> </div> <div class="col-3 no-gutters rule"><h6><strong>Actions</strong></h6></div> </div> </div> </div>'
        //console.log(triggers_instances);
        let ids = [];
        for (let x in triggers_instances) {
            let id = Date.now();
            id += Math.floor(Math.random() * 100);
            id += Math.floor(Math.random() * 100);
            ids.push(id);
            document_row.innerHTML += '<div class="col-12 rule shadow-sm text-center content_box_option" style="margin-top:10px;padding-top:10px;padding-bottom:10px;padding-left:5px; background-color:linen;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"> <select class="form-select" aria-label="origin" id="' + id + '_origin"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" id="type_' + id + '_parameter"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" aria-label="target" id="' + id + '_destination"> </select> </div> <div class="col-3 no-gutters rule"> <div class="row no-gutters rule text-center align-items-center"> <div class="col-6 rule"><a class="instance_delete" style="margin-left:auto;margin-right:auto;" data-toggle="tooltip" data-placement="bottom" title="" onclick="deleteInstance(22,22,' + triggers_instances[x].inner_id + ',false,false)" data-bs-original-title="Delete instance "><strong>-</strong></a></div> <div class="col-6 rule"> <img class="img-fluid align-right" style="max-width: 30px;" src="./res/saveButton2.svg" onclick="saveSequence(22,' + triggers_instances[x].inner_id + ',' + id + ',' + "'" + 'trigger' + "'" + ')"></img> </div> </div> </div> </div> </div>';

            let document_result_origin = document.getElementById(id + '_origin');
            let document_result_relationship_type = document.getElementById('type_' + id + '_parameter');
            let document_result_destination = document.getElementById(id + '_destination');

            //we have to populate the selectors now with the possible operations and parameters
            //lets get the operations first 
            let current_instance_variables = triggers_instances[x].inner_variables[0];
            //console.log("found instance variables: "+JSON.stringify(current_instance_variables));
            let available_triggers = this.available_parents[findPlaceByParentName('Triggers', this.available_parents)][4];
            let available_operations = this.available_parents[findPlaceByParentName('Operations', this.available_parents)][4];
            let available_parameters = this.available_parents[findPlaceByParentName('Parameters', this.available_parents)][4];

            //lets add the origin
            for (let y in available_operations) {
                document_result_origin.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (triggers_instances[x].inner_variables[0].variables.operation_id == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
            }

            // lets add a "none" option for when there is no selection available
            if (current_instance_variables.variables.operation_id == '') {
                document_result_origin.innerHTML += '<option value="" selected>None</option>';
            }


            // lets add a "none" option for when there is no selection available

            if (current_instance_variables.variables.trigger_Type == '') {
                document_result_destination.innerHTML += '<option value="" selected>None</option>';
            } else {
                console.log("Current trigger value = " + current_instance_variables.variables.trigger_value + "\nCurrent trigger type: " + current_instance_variables.variables.trigger_Type);
                let selection = current_instance_variables.variables.trigger_Type;
                document_result_destination.innerHTML = '';
                if (selection == 'parameter') {
                    //we have to populate the destination with the available parameters
                    //lets finish by adding the parameters
                    for (let y in available_parameters) {
                        console.log("adding parameters to the trigger destination");
                        document_result_destination.innerHTML += '<option value=' + "'" + available_parameters[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_parameters[y].inner_id ? 'selected' : '') + '>' + available_parameters[y].Name + '</option>';
                    }
                    if (current_instance_variables.variables.trigger_value == '') {
                        document_result_destination.innerHTML += '<option value="" selected>None</option>';
                    }

                } else if (selection == 'operation') {
                    console.log("adding operations to the trigger destination");
                    for (let y in available_operations) {
                        document_result_destination.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
                    }

                    if (current_instance_variables.variables.trigger_value == '') {
                        document_result_destination.innerHTML += '<option value="" selected>None</option>';
                    }
                } else if (selection == 'state') {

                    document_result_destination.innerHTML = "<option value='run'>run</option><option value='stop'>stop</option>";
                    console.log("adding states to the trigger destination");
                    if (current_instance_variables.variables.trigger_value != '') {
                        document_result_destination.value = current_instance_variables.variables.trigger_value;
                    }

                }
            }


            //lets finish by adding the available types of trigger

            let selection = current_instance_variables.variables.trigger_Type;
            document_result_relationship_type.innerHTML += '<option value="parameter">Parameter</option><option value="state">Profile state</option><option value="operation">by operation</option>';
            document_result_relationship_type.value = current_instance_variables.variables.trigger_Type;
            console.log("Setting the trigger type to:" + current_instance_variables.variables.trigger_Type);
            console.log("Actual value:" + document_result_relationship_type.value);
            if (current_instance_variables.variables.trigger_Type == '') {
                document_result_relationship_type.innerHTML += '<option value="" selected>None</option>';
            } else {
                document.getElementById('type_' + id + '_parameter').value = selection;
            }

        

        }//end of the for that populates the rows

        //re-assigning the trigger types
        for (let x in triggers_instances) {
            let current_instance_variables = triggers_instances[x].inner_variables[0];
            //we get the trigger type
            let type = current_instance_variables.variables.trigger_Type;
            //we get the dom element
            let type_selector = document.getElementById('type_' + ids[x] + '_parameter');
            type_selector.value = type;


            //we add the listener
            type_selector.addEventListener('change', (event) => {

                //available parameters
                let available_parameters = this.available_parents[findPlaceByParentName('Parameters', this.available_parents)][4];
                //get the available operations

                let available_operations = this.available_parents[findPlaceByParentName('Operations', this.available_parents)][4];

                let document_result_relationship_type = document.getElementById("type_" + ids[x] + '_parameter');
                console.log("Switching options: " + document_result_relationship_type.value);
                //we decide what to populate the destination with
                let selection = document_result_relationship_type.value;
                let destination = document.getElementById(ids[x] + "_destination");
                destination.innerHTML = '';
                if (selection == 'parameter') {
                    //we have to populate the destination with the available parameters
                    //lets finish by adding the parameters
                    for (let y in available_parameters) {
                        destination.innerHTML += '<option value=' + "'" + available_parameters[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_parameters[y].inner_id ? 'selected' : '') + '>' + available_parameters[y].Name + '</option>';
                    }
                    if (current_instance_variables.variables.trigger_value == '') {
                        document_result_destination.innerHTML += '<option value="" selected>None</option>';
                    }

                } else if (selection == 'operation') {
                    for (let y in available_operations) {
                        destination.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
                    }

                    if (current_instance_variables.variables.trigger_value == '') {
                        document_result_destination.innerHTML += '<option value="" selected>None</option>';
                    }
                } else if (selection == 'state') {

                    destination.innerHTML = "<option value='run'>run</option><option value='stop'>stop</option>";
                    if (current_instance_variables.variables.trigger_value != '') {
                        destination.value = current_instance_variables.variables.trigger_value;
                    }

                }



            });

        }


    }


}

function populateExternalTriggers() {
    //triggers are a bit tricky because we have to add listeners depending on the type of trigger we select
    let document_row = document.getElementById('external_triggers_container');
    //lets fetch the triggers from the selected collection (if any
    
    let triggers_instances = array[findPlaceByParentName('Triggers', array)][4];
    //if it is a result we need 3 parameters: operation of origin, parameter to create and destination (if any)
    document_row.innerHTML += '<div class="col-12 rule  text-center content_box_option" style="margin-top:10px; background-color:#ffffff;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"><h6><strong>Source</strong></h6></div> <div class="col-3 no-gutters rule"><h6><strong>Trigger\ntype</strong></h6></div> <div class="col-3 no-gutters rule"> <h6><strong>Target</strong></h6> </div> <div class="col-3 no-gutters rule"><h6><strong>Actions</strong></h6></div> </div> </div> </div>'
    //console.log(triggers_instances);
    let ids = [];
    for (let x in triggers_instances) {
        let id = Date.now();
        id += Math.floor(Math.random() * 100);
        id += Math.floor(Math.random() * 100);
        ids.push(id);
        document_row.innerHTML += '<div class="col-12 rule shadow-sm text-center content_box_option" style="margin-top:10px;padding-top:10px;padding-bottom:10px;padding-left:5px; background-color:linen;"><div class="row no-gutters rule align-items-center"> <div class="col-3 no-gutters rule"> <select class="form-select" aria-label="origin" id="' + id + '_origin"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" id="type_' + id + '_parameter"> </select> </div> <div class="col-3 no-gutters rule"><select class="form-select" aria-label="target" id="' + id + '_destination"> </select> </div> <div class="col-3 no-gutters rule"> <div class="row no-gutters rule text-center align-items-center"> <div class="col-6 rule"><a class="instance_delete" style="margin-left:auto;margin-right:auto;" data-toggle="tooltip" data-placement="bottom" title="" onclick="deleteInstance(22,22,' + triggers_instances[x].inner_id + ',false,false)" data-bs-original-title="Delete instance "><strong>-</strong></a></div> <div class="col-6 rule"> <img class="img-fluid align-right" style="max-width: 30px;" src="./res/saveButton2.svg" onclick="saveSequence(22,' + triggers_instances[x].inner_id + ',' + id + ',' + "'" + 'trigger' + "'" + ')"></img> </div> </div> </div> </div> </div>';

        let document_result_origin = document.getElementById(id + '_origin');
        let document_result_relationship_type = document.getElementById('type_' + id + '_parameter');
        let document_result_destination = document.getElementById(id + '_destination');

        //we have to populate the selectors now with the possible operations and parameters
        //lets get the operations first 
        let current_instance_variables = triggers_instances[x].inner_variables[0];
        //console.log("found instance variables: "+JSON.stringify(current_instance_variables));
        let available_triggers = this.available_parents[findPlaceByParentName('Triggers', this.available_parents)][4];
        let available_operations = this.available_parents[findPlaceByParentName('Operations', this.available_parents)][4];
        let available_parameters = this.available_parents[findPlaceByParentName('Parameters', this.available_parents)][4];

        //lets add the origin
        for (let y in available_operations) {
            document_result_origin.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (triggers_instances[x].inner_variables[0].variables.operation_id == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
        }

        // lets add a "none" option for when there is no selection available
        if (current_instance_variables.variables.operation_id == '') {
            document_result_origin.innerHTML += '<option value="" selected>None</option>';
        }


        // lets add a "none" option for when there is no selection available

        if (current_instance_variables.variables.trigger_Type == '') {
            document_result_destination.innerHTML += '<option value="" selected>None</option>';
        } else {
            console.log("Current trigger value = " + current_instance_variables.variables.trigger_value + "\nCurrent trigger type: " + current_instance_variables.variables.trigger_Type);
            let selection = current_instance_variables.variables.trigger_Type;
            document_result_destination.innerHTML = '';
            if (selection == 'parameter') {
                //we have to populate the destination with the available parameters
                //lets finish by adding the parameters
                for (let y in available_parameters) {
                    console.log("adding parameters to the trigger destination");
                    document_result_destination.innerHTML += '<option value=' + "'" + available_parameters[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_parameters[y].inner_id ? 'selected' : '') + '>' + available_parameters[y].Name + '</option>';
                }
                if (current_instance_variables.variables.trigger_value == '') {
                    document_result_destination.innerHTML += '<option value="" selected>None</option>';
                }

            } else if (selection == 'operation') {
                console.log("adding operations to the trigger destination");
                for (let y in available_operations) {
                    document_result_destination.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
                }

                if (current_instance_variables.variables.trigger_value == '') {
                    document_result_destination.innerHTML += '<option value="" selected>None</option>';
                }
            } else if (selection == 'state') {

                document_result_destination.innerHTML = "<option value='run'>run</option><option value='stop'>stop</option>";
                console.log("adding states to the trigger destination");
                if (current_instance_variables.variables.trigger_value != '') {
                    document_result_destination.value = current_instance_variables.variables.trigger_value;
                }

            }
        }


        //lets finish by adding the available types of trigger

        let selection = current_instance_variables.variables.trigger_Type;
        document_result_relationship_type.innerHTML += '<option value="parameter">Parameter</option><option value="state">Profile state</option><option value="operation">by operation</option>';
        document_result_relationship_type.value = current_instance_variables.variables.trigger_Type;
        console.log("Setting the trigger type to:" + current_instance_variables.variables.trigger_Type);
        console.log("Actual value:" + document_result_relationship_type.value);
        if (current_instance_variables.variables.trigger_Type == '') {
            document_result_relationship_type.innerHTML += '<option value="" selected>None</option>';
        } else {
            document.getElementById('type_' + id + '_parameter').value = selection;
        }

    

    }//end of the for that populates the rows

    //re-assigning the trigger types
    for (let x in triggers_instances) {
        let current_instance_variables = triggers_instances[x].inner_variables[0];
        //we get the trigger type
        let type = current_instance_variables.variables.trigger_Type;
        //we get the dom element
        let type_selector = document.getElementById('type_' + ids[x] + '_parameter');
        type_selector.value = type;


        //we add the listener
        type_selector.addEventListener('change', (event) => {

            //available parameters
            let available_parameters = this.available_parents[findPlaceByParentName('Parameters', this.available_parents)][4];
            //get the available operations

            let available_operations = this.available_parents[findPlaceByParentName('Operations', this.available_parents)][4];

            let document_result_relationship_type = document.getElementById("type_" + ids[x] + '_parameter');
            console.log("Switching options: " + document_result_relationship_type.value);
            //we decide what to populate the destination with
            let selection = document_result_relationship_type.value;
            let destination = document.getElementById(ids[x] + "_destination");
            destination.innerHTML = '';
            if (selection == 'parameter') {
                //we have to populate the destination with the available parameters
                //lets finish by adding the parameters
                for (let y in available_parameters) {
                    destination.innerHTML += '<option value=' + "'" + available_parameters[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_parameters[y].inner_id ? 'selected' : '') + '>' + available_parameters[y].Name + '</option>';
                }
                if (current_instance_variables.variables.trigger_value == '') {
                    document_result_destination.innerHTML += '<option value="" selected>None</option>';
                }

            } else if (selection == 'operation') {
                for (let y in available_operations) {
                    destination.innerHTML += '<option value=' + "'" + available_operations[y].inner_id + "'" + (current_instance_variables.variables.trigger_value == available_operations[y].inner_id ? 'selected' : '') + '>' + available_operations[y].Name + '</option>';
                }

                if (current_instance_variables.variables.trigger_value == '') {
                    document_result_destination.innerHTML += '<option value="" selected>None</option>';
                }
            } else if (selection == 'state') {

                destination.innerHTML = "<option value='run'>run</option><option value='stop'>stop</option>";
                if (current_instance_variables.variables.trigger_value != '') {
                    destination.value = current_instance_variables.variables.trigger_value;
                }

            }



        });

    }


}

function saveSequence(parent_id, instance_id, dom_id, type) {


    switch (type) {
        case 'trigger':
            //  3 fields to read: origin, parameter and destination. In this case the origin is the instance we are referring to. The instance ID SHOULD NOT be used for triggers.
            // 3 values to read: origin -> operation_id, parameter -> trigger_type, destination -> trigger_value

            //lets read the current values from the ui
            let operation_id = document.getElementById(dom_id + '_origin').value;
            let trigger_type = document.getElementById('type_' + dom_id + '_parameter').value;
            let trigger_value = document.getElementById(dom_id + '_destination').value;

            //lets get the instance from the current array
            let instance_to_edit = findInstanceInStorage(parent_id, instance_id);

            //assign the values

            instance_to_edit.inner_variables[0].variables.trigger_Type = trigger_type;
            instance_to_edit.inner_variables[0].variables.trigger_value = trigger_value;
            instance_to_edit.inner_variables[0].variables.operation_id = operation_id;

            //we update the cache of the profile
            saveInstanceCache();


            break;

        case 'dependency':
            //lets read the current values from the ui
            let operation_id_dependency = document.getElementById(dom_id + '_origin').value;
            let dependency_type = document.getElementById(+dom_id + '_parameter').value;
            let dependency_target = document.getElementById(dom_id + '_destination').value;

            //lets get the instance from the current array
            let instance_to_edit_dependency = findInstanceInStorage(parent_id, instance_id);

            //assign the values

            instance_to_edit_dependency.inner_variables[0].variables.operational_dependency_type = dependency_type;
            instance_to_edit_dependency.inner_variables[0].variables.target_operation_ID = dependency_target;
            instance_to_edit_dependency.inner_variables[0].variables.source_operation_id = operation_id_dependency;

            //we update the cache of the profile
            saveInstanceCache();
            break;

        case 'result':
            //lets read the current values from the ui
            let operation_id_result = document.getElementById(dom_id + '_origin').value;
            let result_parameter = document.getElementById(dom_id + '_parameter').value;
            let result_destination = document.getElementById(dom_id + '_destination').value;

            //lets get the instance from the current array
            let instance_to_edit_result = findInstanceInStorage(parent_id, instance_id);

            //assign the values

            instance_to_edit_result.inner_variables[0].variables.parameter = result_parameter;
            instance_to_edit_result.inner_variables[0].variables.target_operation = result_destination;
            instance_to_edit_result.inner_variables[0].variables.source_operation = operation_id_result;

            //we update the cache of the profile
            saveInstanceCache();

            break;
    }


}


//---------------------------End of the sequencer related functions----------------------

//function to get the list of available taxonomical consumption guides

function getGuidesList() {
    //first find the schemas that are guides
    let list_of_schemas_that_are_guides = [];
    for (x in db.schema_Array) {
        if (db.schema_Array[x].hasOwnProperty('is_guide')) {
            if (db.schema_Array[x].is_guide) {
                list_of_schemas_that_are_guides.push(db.schema_Array[x].element_id);
            }
        }
    }

    //now look into the profiles to see who has an element_schema that matches any of the guides schemas
    let final_list_of_guides = [];

    for (x in list_of_schemas_that_are_guides) {
        for (y in db.profile_Array) {
            //is there a match?
            if (db.profile_Array[y].element_schema == list_of_schemas_that_are_guides[x]) {
                final_list_of_guides.push(db.profile_Array[y].element_id);
            }
        }
    }


    return final_list_of_guides;
}

function deleteExternalTrigger(trigger_id){
    //we access the cache and retrigger the external triggers initializer

    //we get the collection
    for(let x in this.external_triggers_cache){
        if(this.external_triggers_cache[x].element_id == trigger_id){
            //we get the parent collection
            let parent_collection_external_triggers = this.external_triggers_cache[x].parent_collection.external_triggers;
            for(let y in parent_collection_external_triggers){
                if(parent_collection_external_triggers[y].element_id == trigger_id){
                    parent_collection_external_triggers.splice(y,1);
                    alertify.success("Trigger deleted successfully");
                    playSound('delete');
                    updateLocalStorage();
                    externalTriggersPopulation(false,true);
                }
            }
        }
    }

}

function saveExternalTrigger(trigger_id){
    //we access the cache and retrigger the external triggers initializer

    //we get the collection
    for(let x in this.external_triggers_cache){
        if(this.external_triggers_cache[x].element_id == trigger_id){
            //we get the parent collection
            let parent_collection_external_triggers = this.external_triggers_cache[x].parent_collection.external_triggers;
            for(let y in parent_collection_external_triggers){
                if(parent_collection_external_triggers[y].element_id == trigger_id){
                    

                    let trigger_to_update = parent_collection_external_triggers[y];
                    trigger_to_update.target_operation = document.getElementById(trigger_to_update.element_id+'_origin').value;
                    trigger_to_update.trigger_type = document.getElementById('type_'+trigger_to_update.element_id+'_parameter').value;
                    trigger_to_update.trigger_value = document.getElementById(trigger_to_update.element_id+'_destination').value;
                    alertify.success('New trigger succesfully assigned!');
                    playSound('success_2');
                    updateLocalStorage();
                    externalTriggersPopulation(false,true);
                }
            }
        }
    }

}