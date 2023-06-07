function loadSchema(){
    try {
        if (document.getElementById("schema_name_field").value !=="" && document.getElementById("schema_load_field").value !==""){
            // we create a new object
            var schema = new Object();
            //we assign new property/attribute pairs to it reading from the DOM
            schema["element_name"] = $("#schema_name_field").val();
            schema["element_content"] = JSON.parse($("#schema_load_field").val());
            schema["is_guide"] = document.getElementById('the_schema_is_guide').ariaChecked;
            //We save to the storage
            saveToStorage("schema",schema,true);
            //Notify the success to the user
            alertify.notify('Schema loaded', 'success', 2);
            //Hide the modal
            $("#load_schema_modal").modal('hide');
            //we clean the fields here
            document.getElementById('schema_name_field').value="";
            document.getElementById('schema_load_field').value="";
            
        }else{
            alertify.notify('There is data missing', 'error', 2);
        }
    } catch (error) {
        alertify.notify('Please check your JSON data and try again', 'error', 2);
    }
    
}