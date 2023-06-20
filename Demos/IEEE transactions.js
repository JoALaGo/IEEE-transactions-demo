

var mytutorial = new Tutorial("ieee_tutorial",{
    steps: [
        {
            highlight: "#rad_logo",
            title: "First step",
            text: "Welcome to our demo of RADIANCE!"
        },
        {
            highlight: "#change_prof",
            title: "Second step",
            text: "You can change the current profile using this button.",
            callback: {
                fn: () => document.getElementById('change_prof').click()
            }
        },
        {
            highlight: "#\\1216056141921",
            title: "Third step",
            text: "We will switch to this profile",
            callback: {
                fn: () => document.getElementById('1216056141921').click()
            }
        }
    ]
});mytutorial.start();