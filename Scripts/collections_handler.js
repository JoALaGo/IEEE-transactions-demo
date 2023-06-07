// we need a global variable to decide which collection we will edit
var collection_selected = '';
var parameter_pool = '';
var assigned_profiles = [];
var deassigned_profiles = [];
var assigned_collections = [];
var deasssigned_collections = [];
var collection_innheritance_tree = [];
var inheritance_tree_branches = ['inheritance_tree_branch_1','inheritance_tree_branch_2','inheritance_tree_branch_3','inheritance_tree_branch_4'];
var temporal_parameter_pool = [];
function collectionsBuilderInitialization() {
    if (collection_selected == '') {
        //we display the modal to select a collection
        $('#collection_builder_selection_modal').modal('show');
    } else {
        reInitializeCollectionsView();
    }
}
function chooseCollection(element_id) {

    let collection = db["collection_Array"][findProfilePlaceInStorage('collection', element_id)];
    this.collection_selected = collection;

    $('#collection_builder_selection_modal').modal('hide');
    //replace the name of the collection
    reInitializeCollectionsView();

}

function reInitializeCollectionsView() {
    document.getElementById('collections_builder_assigned_profiles').innerHTML = '';
    document.getElementById('collections_builder_deassigned_profiles').innerHTML = '';
    document.getElementById('collections_builder_assigned_collections').innerHTML = '';
    document.getElementById('collections_builder_deassigned_collections').innerHTML = '';
    document.getElementById('parameter_pool').innerHTML = '';
    clear_inheritance_tree();
    synchronizeAvailableContentListElements(false, { class: 'profile_assign', type: "profile", dom_data_type: "profile-assign" });
    synchronizeAvailableContentListElements(false, { class: 'profile_deassign', type: "profile", dom_data_type: "profile-deassign" });
    synchronizeAvailableContentListElements(false, { class: 'collection_assign', type: "collection", dom_data_type: "collection-assign" });
    synchronizeAvailableContentListElements(false, { class: 'collection_deassign', type: "collection", dom_data_type: "collection_deassign" });
    let parameter_pool = [];
    this.collection_innheritance_tree =[];
    fillParameterPool(collection_selected,parameter_pool,0);//it is not worth it to alter synchronizeAvailableContentListElements.. just handle it manually.
    populateParameterPool(parameter_pool);
    this.temporal_parameter_pool= parameter_pool;
    removeInheritedCollections();
    populateCollectionInheritanceTree();
    //addToCollectionsView();
    //replace the name of the collection
    document.getElementById('currently_selected_collection').innerHTML = '';
    document.getElementById('currently_selected_collection').innerHTML = collection_selected.element_name;
    restartTooltips();
}

function addToCollectionsView(){
    synchronizeAvailableContentListElements(false, { class: 'profile_assign', type: "profile", dom_data_type: "profile-assign" });
    synchronizeAvailableContentListElements(false, { class: 'profile_deassign', type: "profile", dom_data_type: "profile-deassign" });
    synchronizeAvailableContentListElements(false, { class: 'collection_assign', type: "collection", dom_data_type: "collection-assign" });
    synchronizeAvailableContentListElements(false, { class: 'collection_deassign', type: "collection", dom_data_type: "collection_deassign" });
    let parameter_pool = [];
    fillParameterPool(collection_selected,parameter_pool,0);//it is not worth it to alter synchronizeAvailableContentListElements.. just handle it manually.
    populateParameterPool(parameter_pool);
}

function clear_inheritance_tree(){
    for(let x in inheritance_tree_branches){
        document.getElementById(inheritance_tree_branches[x]).innerHTML='';
    }
    //we clear the lines
    for(let x in this.tree_lines){
        this.tree_lines[x].remove();
    }
    this.tree_lines = []
}

function collectionDeassign(id, collection) {
    if (collection == "false" || collection == null) {
        collection = this.collection_selected.inner_profiles;
    } else {
        collection = this.collection_selected.inner_collections;
    }
    //we have to check if it is already assigned


    for (let x in collection) {
        if (collection[x] == id) {
            collection.splice(x, 1);
        }
    }
    reInitializeCollectionsView();
    updateLocalStorage();
    playSound('Success_2');
}
function collectionAssign(id, collection) {
    if (collection == "false" || collection == null) {
        collection = this.collection_selected.inner_profiles;
    } else {
        collection = this.collection_selected.inner_collections;
    }
    if (checkIfAssigned(id, collection)) { return; };
    collection.push(id);
    reInitializeCollectionsView();
    updateLocalStorage();
    playSound('Success_2');
}

function fillParameterPool(collection,parameter_pool,branch) {
    //we get all the parameters for each profile in the collection and place them in the UI under the parameter pool
    //this lets the user know that those parameters can apply at a global scale within the collection:
    // any of the parameters in the pool can be used by any operation in the collection.
    branch = branch+1;
    console.log(branch);

    if (collection == '') { //TODO: if the configuration of the collection is set to exclusive, no parameter pool should be available as each profile will be self-contained
        collection = this.collection_selected;
    } 

        let profiles = collection.inner_profiles;
        let collections = collection.inner_collections;
        
        this.collection_innheritance_tree.push({branch:branch,collections:collections,parent:collection.element_id});
        for (let x in profiles) {
            //we get the profile 
            let profile = db.profile_Array[findProfilePlaceInStorage('profile', profiles[x])];
            let parsed_profile = JSON.parse(profile.profile_cache);
          
            let parameters_array = parsed_profile[findPlaceByParentName('Parameters', parsed_profile)][4];//place 4 is reserved for the instances
            //now that we have the parameters array for the profile, we have to find for each parameter if it is external, if it is.. we push it to the list with the id of the parent
            // in this way the profile builder will be able to recognize the non exclusive parameters available for a profile
            for (let y in parameters_array) {
                checkParameterDirection(parameters_array[y].inner_variables[0].variables) == true ? parameter_pool.push({parameter:parameters_array[y], profile_id: profile.inner_id, collection:collection.element_id }) : null; //we store the parameter if it is valid
            }
        }
        //if the collection is the same collection, we return the parameters pool without recursion
        
        for(let x in collections){
            console.log(collections[x]);
            let current_collection = db.collection_Array[findProfilePlaceInStorage('collection', collections[x])];
            if(current_collection==null){
                
                alertify.confirm('Error encountered', 'A pre-existing collection within this collection was not found, do you wish to remove it to avoid further collisions?', function(){ 
                    alertify.success('Inexistent collection removed from the current collection'); 
                    collections.splice(x,1);
                    updateLocalStorage();
                }, function(){
                    });

            }else{
            if(current_collection.element_id!== this.collection_selected.element_id){
                 //we use recursion
                console.log("Checking collections :"+ collections);
                fillParameterPool(current_collection,parameter_pool,branch);
             }
            }

             
            
        }
        
        return parameter_pool;
    

    function checkParameterDirection(parameter) {
        if (parameter.direction == 'external') {
            return true;
        } else {
            return false;
        }

    }
}


function removeInheritedCollections(){
    //we have to remove all the collections that are already further down the collection tree so that they are not selected
    
    for(let x in collection_innheritance_tree){
        for(let y in collection_innheritance_tree[x].collections){
            //console.log("attempting to remove: "+collection_innheritance_tree[x].collections[y]);
            if(document.getElementById("deassigned_"+collection_innheritance_tree[x].collections[y]+"_collection")!== null && document.getElementById("assigned_"+collection_innheritance_tree[x].collections[y]+"_collection")==null){
                    document.getElementById("deassigned_"+collection_innheritance_tree[x].collections[y]+"_collection").remove();
                
            }
        }
    }
}


