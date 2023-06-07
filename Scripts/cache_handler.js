var availableTypes = ["schema", "profile", "collection"];
var db = new Object();

class Collection {
    constructor() {

        this.element_name = 'New collection';
        this.inner_profiles = [];
        this.inner_collections = [];
        this.collection_settings = { exclusive_mode: false };
    }
}

document.addEventListener("DOMContentLoaded", function (event) {
    //we are ready baby
    initializeArrays();
});

var from = "";

function initializeArrays() {
    from = "initialize arrays:";
    availableTypes.forEach(type => {
        createArray(type);
    });

    this.db["builderConfigurations"] = [];
    this.db["customFunctions"] = new Map();
    //check the local storage
    //check if there is existing data from local storage
    if (window.localStorage.getItem("db") !== null) {
        console.log(from + ": Restoring data from local storage");
        db = JSON.parse(window.localStorage.getItem("db"));
        restartUI();
    } else {
        localStorage.setItem('db', '');
        initializeArrays();
    }


}

function createArray(type) {
    from = "createArray";
    //we store the hashmap
    console.log(from + ": creating hashmap " + type);
    db[type + "_Array"] = [];
}


function saveToStorage(type, data, newId) {
    //if newId is true, we assign a new ID to it
    if (type == "builder_config") {
        this.db.builderConfigurations.push(data);
        updateLocalStorage();

    } else if (type == "builder_algorithm") {
        this.db['builder_algorithm'] = builder_algorithm_editor.getValue();
        updateLocalStorage();
        playSound('Success');
        alertify.success('Algorithm saved successfuly');

    } else {
        from = "save to storage: ";
        if (newId == true) { id = Date.now(); data["element_id"] = id; }
        //lets add the type to the data
        data['element_type'] = type;
        this.db[type + '_Array'].push(data);
        updateLocalStorage();
        playSound('Success');
    }
}

function deleteFromStorage(type, id) {
    alert('To prevent data loss, the current configuration will be downloaded.');
    downloadLibrary('builder_cofig');
    from = "deleteFromStorage: ";
    console.log(from + " deleting from storage : " + id + " type: " + type);
    //search in the array the place of the element to delete
    db[type + '_Array'].splice(findProfilePlaceInStorage(type, id), 1);
    if (type == "profile") {
        //we have to burn the configurations as well.
        db.builderConfigurations.splice(findConfigIndexById(id), 1);
        console.log("%cProfile  deleted succesfully.", "color:red;");
    }
    updateLocalStorage();
    alertify.success("Succesfully deleted the profile.");
    playSound("delete");
}

function cloneFromStorage(type, id) {
    from = "cloneFromStorage: ";
    let clone = new Object();
    console.log(from + " cloning " + id);
    Object.assign(clone, db[type + "_Array"][findProfilePlaceInStorage(type, id)]);
    clone.element_id = createUID();
    clone.element_name += "_clone";

    //we now have to clone the configuration
    if (type == "profile") {
        let new_config;

        try {
            //we get the existing configuration
            console.log("Config to clone:\n" + JSON.stringify(this.db.builderConfigurations[findConfigIndexById(id)]));
            new_config = JSON.parse(JSON.stringify(this.db.builderConfigurations[findConfigIndexById(id)]));
            new_config.element_id = clone.element_id;
            console.log("Pushing new config:\n" + JSON.stringify(new_config));
            this.db.builderConfigurations.push(new_config);

        } catch (error) {
            alertify.error("The profile was cloned but no configuration was copied");
        }


        //the next issue to solve is the duplicate ID for operations, parameters, triggers, results and dependencies
        //TODO:WE NEED TO HANDLE DEPENDENCIES AMONG ENTITIES IN THE PROFILE BEFORE INCORPORATING ID swapping
        //Now that we have the profile, we get the operation instances
        let profile = JSON.parse(clone.profile_cache);
        let profile_operations = profile[findPlaceByParentName('Operations', profile)][4];
        let profile_parameters = profile[findPlaceByParentName('Parameters', profile)][4];
        let profile_cycles = profile[7][4];
        let profile_cycle_TE = profile[8][4];
        let profile_events = profile[11][4];
        let profile_events_te = profile[12][4];
        let profile_operational_dependencies = profile[21][4];
        let profile_triggers = profile[22][4];
        let profile_results = profile[23][4]
        //Get operation n
        //Get triggers: check the involvement of operation 0 in each trigger and change the original id of operation 0 to the new id
        //get results: check the involvement of the current parameter in results and change the id
        //get operational dependencies: check all the dependencies and be sure that the current operation's id is switched to the new one
        //Get parameter n
        //Get triggers: check the involvement of parameter n in each trigger and change the original id of parameter n to the new id
        //Get results: check the involvement of the current parameter in results and change the id




        for (let x in profile_cycles) {//Get cycle n
            let old_id = profile_cycles[x].inner_id;
            let new_id = createUID();
            //Get timed expectations: switch the original cycle id to its new id
            for (let y in profile_cycle_TE) {

                if (profile_cycle_TE[y].parent_instance_id == old_id) {
                    profile_cycle_TE[y].parent_instance_id = new_id;
                    console.log("Clonning TE for cycle " + old_id + " with new parent id " + profile_cycle_TE[y].parent_instance_id);
                }
                //we change the id of the current TE
                console.log("Re-id the cycle te " + profile_cycle_TE[y].inner_id + " to ");
                profile_cycle_TE[y].inner_id = createUID();
                console.log(profile_cycle_TE[y].inner_id);
            }
            //we assign the new id to the cycle
            console.log("Re- id the cycle " + profile_cycles[x].inner_id + " to ");
            profile_cycles[x].inner_id = new_id;
            console.log(profile_cycles[x].inner_id);

        }

        for (let x in profile_events) {//Get event n
            let old_id = profile_events[x].inner_id;
            let new_id = createUID();
            //Get timed expectations: switch the original event id to its new id
            for (let y in profile_events_te) {
                let current_te = profile_events_te[y];
                if (profile_events_te[y].parent_instance_id == old_id) {
                    profile_events_te[y].parent_instance_id = new_id;
                }
                //we change the id of the current TE
                profile_events_te[y].inner_id = createUID();
            }
            //we assign the new id to the event
            console.log("Re-id the event " + profile_cycles[x].inner_id + " to ");
            profile_cycles[x].inner_id = new_id;
            console.log(profile_cycles[x].inner_id);
        }

        for (let x in profile_parameters) {
            var old_id = profile_parameters[x].inner_id;
            var inner_old_id = profile_parameters[x].inner_variables[0].parameter_ID;
            var new_id = createUID();
            //we get the results to change the id
            for (let y in profile_results) {
                let results_id = profile_results[y].inner_id;
                let parameter_id = profile_results[y].inner_variables[0].variables.parameter;
                if (parameter_id == old_id) {
                    profile_results[y].inner_variables[0].variables.parameter = new_id;
                }
                console.log("Re-id the result " + profile_results[y].inner_id + " to ");
                profile_results[y].inner_id = createUID();
                console.log(profile_results[y].inner_id);
            }

            for (let y in profile_triggers) {
                let trigger_id = profile_triggers[y].inner_id;
                let parameter_id = profile_triggers[y].inner_variables[0].variables.trigger_value;
                if (parameter_id == old_id) {
                    profile_triggers[y].inner_variables[0].variables.trigger_value = new_id;
                }

                console.log("Re-id the trigger " + trigger_id + " to ");
                profile_triggers[y].inner_id = createUID();
                console.log(profile_triggers[y].inner_id);
            }

            console.log("Re-id the parameter " + old_id + " to ");
            profile_parameters[x].inner_id = new_id;
            profile_parameters[x].inner_variables[0].parameter_ID = new_id;
            profile_parameters[x].inner_variables[0].variables.parameter_ID = new_id;
            console.log(profile_parameters[x].inner_id);

        }

        for (let x in profile_operations) {//we grab every instance of an operation
            var old_id = profile_operations[x].inner_id;
            var inner_old_id = profile_operations[x].inner_variables[0].operation_ID;
            var new_id = createUID();
            //we get the results to change the id of the pertinent operation n
            for (let y in profile_results) {

                let source_operation = profile_results[y].inner_variables[0].variables.source_operation;
                let targer_operration = profile_results[y].inner_variables[0].variables.target_operation;
                if (source_operation == old_id) {
                    profile_results[y].inner_variables[0].variables.source_operation = new_id;
                }
                if (targer_operration == old_id) {
                    profile_results[y].inner_variables[0].variables.target_operation = new_id;
                }

            }

            for (let y in profile_triggers) {//we get the triggers to change the pertinent operation n ID
                let trigger_id = profile_triggers[y].inner_id;
                let trigger_value = profile_triggers[y].inner_variables[0].variables.trigger_value;
                let trigger_source = profile_triggers[y].inner_variables[0].variables.operation_id;
                if (trigger_value == old_id) {
                    profile_triggers[y].inner_variables[0].variables.trigger_value = new_id;
                }
                if (trigger_source == old_id) {
                    profile_triggers[y].inner_variables[0].variables.operation_id = new_id;
                }
            }
            console.log("Clone operation id " + old_id + " changed to :");
            profile_operations[x].inner_id = new_id;
            profile_operations[x].inner_variables[0].operation_ID = new_id;
            profile_operations[x].inner_variables[0].variables.operation_ID = new_id;
            console.log(profile_operations[x].inner_variables[0].operation_ID);
        }

        clone.profile_cache = JSON.stringify(profile);
    }
    alertify.notify('Cloning successful', 'success', 2);
    console.log(from + " cloning succesful, clone: " + clone.element_id);
    saveToStorage(type, clone, false);
    playSound("clone");

}

function createUID() {
    return Math.floor(Date.now() * Math.random());
}

function findProfilePlaceInStorage(type, id) {
    let db_element = db[type + "_Array"];
    for (i = 0; i < db_element.length; i++) {
        if (db_element[i].element_id == id) {
            return i;
        }
    }
    return null;// when the profile does not exist
}



function findProfilePlaceInStorageByName(name) {
    let db_element = db["profile_Array"];
    for (i = 0; i < db_element.length; i++) {
        if (db_element[i].element_name == name) {
            return i;
        }
    }
    return null;// when the profile does not exist
}

//this function returns the instance inside of a parents by looking for an ID.
function findInstanceInStorage(parent_index, instance_id) {
    console.log("%cAttempting to find instance " + instance_id + " in " + parent_index, "color:#4287f5");
    for (let x in this.available_parents[parent_index][4]) {
        let current_instance = this.available_parents[parent_index][4][x];
        if (current_instance.inner_id == instance_id) {
            //console.log("%c Found instance: \n" + JSON.stringify(current_instance), "color:#4287f5");
            return current_instance;
        }
    }

    alertify.error("No instance found");
    return null;
}

function findConfigurationPlaceInStorage(profile_id) {

    for (let x in this.db.builderConfigurations) {
        if (this.db.builderConfigurations[x].element_id == profile_id) {
            return x;
        }
    }

    return null;

}

function findInstanceInProfile(parent_index, instance_id, profile) {
    //console.log("%cAttempting to find instance " + instance_id + " in " + parent_index, "color:#4287f5");
    for (let x in profile[parent_index][4]) {
        let current_instance = profile[parent_index][4][x];
        if (current_instance.inner_id == instance_id) {
            //console.log("%c Found instance: \n" + JSON.stringify(current_instance), "color:#4287f5");
            return current_instance;
        }
    }

    alertify.error("No instance found");
    return null;
}


function getInstanceFromArray(instance_array, target_id) {
    let found_instance = null;
    for (let x in instance_array) {
        //console.log(instance_array[x]);
        if (instance_array[x].inner_id == target_id) {
            found_instance = instance_array[x];
            return found_instance;
        }
    }
    return found_instance;
}

function getSchemaFromArray(schema_array, schema_id) {
    let found_instance = null;
    for (let x in schema_array) {
        //console.log(instance_array[x]);
        if (schema_array[x].element_id == schema_id) {
            found_instance = schema_array[x];
            return found_instance;
        }
    }
    return found_instance;
}

function updateLocalStorage() {
    let mem = checkMemoryUsage();
    try {
        window.localStorage.removeItem("db");
        window.localStorage.setItem("db", JSON.stringify(db));
        restartUI();
    } catch (error) {
        if (mem > 190) {
            alertify.alert("The project size is too big for the memory available. Please segment your project into multiple projects.");
        }
    }


}

function checkMemoryUsage() {
    //we refresh the memory usage of the project
    try {
        let memory_meter = document.getElementById("memory_meter");
        let memory_usage = document.getElementById("mem_usage");
        let usage = (((localStorage['db'].length * 16) / (8 * 1024)) / 1024).toFixed(2);
        let proportion = ((Number(usage) * 100) / 5).toFixed(2);
        memory_usage.innerHTML = '';
        memory_usage.innerHTML += usage;
        memory_meter.style.width = proportion + "%";

        if (proportion <= 30) {
            memory_meter.style.backgroundColor = "#9ef542";
        } else if (proportion > 30 && proportion <= 60) {
            memory_meter.style.backgroundColor = "#f5d742";
        } else {
            memory_meter.style.backgroundColor = "#e60017";

        }

        return proportion;
    } catch (error) {

    }


}

function deleteLocalStorage() {
    alertify.confirm('Delete project', 'Are you sure you want to delete the current project?', function () {
        downloadDatabase();
        downloadAlgorithm();
        window.localStorage.removeItem("db");
        restartUI();
        alertify.error('PROJECT NUKED');
        location.reload();
    }
        , function () { alertify.error('NUKE ABORTED') });



}

function downloadElement(type, id) {
    let place = findProfilePlaceInStorage(type, id);
    let text = JSON.stringify(db[type + "_Array"][place]);
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', db[type + "_Array"][place].element_name);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
}

function downloadDatabase() {
    let text = JSON.stringify(db);
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', 'project backup');
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
}

function downloadAlgorithm(type) {
    if (type == 'builder_algorithm') {
        let text = JSON.stringify(db.builder_algorithm);
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', 'builder_algorithm');
        element.style.display = 'none';
        document.body.appendChild(element);
        element.click();
    } else if (type == 'collection_algorithm') {

    }
}

function downloadLibrary(type) {
    //we retrieve the data from our db
    type = type == 'builder_config' ? downloadBuilderConfig() : downloadArrayLibrary(type);

    function downloadArrayLibrary() {
        for (i in db[type + "_Array"]) {

            let text = JSON.stringify(db[type + "_Array"][i]);
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
            element.setAttribute('download', db[type + "_Array"][i].element_name);

            element.style.display = 'none';
            document.body.appendChild(element);

            element.click();
        }
    }

    function downloadBuilderConfig() {
        let text = JSON.stringify(db.builderConfigurations);
        var element = document.createElement('a');
        element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
        element.setAttribute('download', "builder configuration");

        element.style.display = 'none';
        document.body.appendChild(element);

        element.click();
    }
}

function downloadBuilderCache() {
    let text = JSON.stringify(this.available_parents);
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', "builder cache");

    element.style.display = 'none';
    document.body.appendChild(element);

    element.click();

}

function saveRawEdit() {
    let type = element_to_edit.element_type; //restore the temporal values of our intersticial object "element_to_edit"
    let storage_place = findProfilePlaceInStorage(type, element_to_edit.element_id);
    if (type !== 'collection') {
        db[type + "_Array"][storage_place].element_content = JSON.parse(document.getElementById("raw_text_field").value);
        db[type + "_Array"][storage_place].is_guide = document.getElementById('the_modified_schema_is_guide').checked;
    }
    db[type + "_Array"][storage_place].element_name = document.getElementById("raw_name").value;
    updateLocalStorage();
    restartUI();
    $("#raw_edit_modal").modal('hide');
    alertify.notify('Element modified', 'success', 2);
    playSound("Success");
}

function instanceSchema(schemaId) {
    from = "instanceSchema: ";
    let object_to_instance = db["schema_Array"][findProfilePlaceInStorage('schema', schemaId)];
    console.log(from + "instancing from content: " + JSON.stringify(object_to_instance.element_content));
    //copy the content to the new instance
    let toInstance = JSON.stringify(object_to_instance.element_content);
    let instance = new Object();
    instance.element_content = JSON.parse(toInstance);
    instance.element_name = object_to_instance.element_name + "_instance";
    instance.element_rated = false;
    instance.element_schema = schemaId;
    console.log(from + " instancing: " + schemaId + " instance name: " + instance.element_name);
    saveToStorage("profile", instance, true);
    $("#schema_selection_modal").modal('hide');
    alertify.notify('Profile ' + instance.element_name + ' created', 'success', 2);
    playSound("Success");
}


function instanceCollection() {
    saveToStorage('collection', new Collection(), true);
}

function saveInstanceCache() {
    console.log("Saving instance to cache");
    let place_in_storage = findProfilePlaceInStorage("profile", element_to_edit.element_id);

    db.profile_Array[place_in_storage]["profile_cache"] = JSON.stringify(this.available_parents);

    console.log("%c Instance successfully saved to cache. ", "color:#4287f5");
    //run the algorithm so that the ratings stay up to date
    updateLocalStorage();
    reasonerPlantumlDiagram('sequence');
}





