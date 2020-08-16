(function () {
    Vue.component("modal", {
        template: "#modalTemplate",
        props: ["modalImageId"],
        data: function () {
            return {
                imageInModal: {},
                commentData: [],
                makeComment: {
                    comment: null,
                    username: null,
                },
            };
        },
        mounted: function () {
            let thisIs = this;
            //getting all the data for the image shown in modal
            axios
                .get("/images/" + thisIs.modalImageId)
                .then(function (res) {
                    console.log('GET "/images/:id"', res);
                    thisIs.imageInModal = res.data.imageData;
                    thisIs.commentData = res.data.commentData;
                })
                .catch(function (err) {
                    console.log('Error at GET "/images/:id": ', err);
                });
        },
        //This updates the image when modal is open and id in the url changes
        // --> whenever the image ID changes, this function runs
        //if there is a change in the url with a valid imageId as selectedImageId = location.hash.slice(1)
        //while the modal is open, then this functions causes all the data for the modal to be loaded
        watch: {
            modalImageId: function () {
                console.log(
                    "image ID changed in component: ",
                    this.modalImageId
                );
                let thisIs = this;
                axios
                    .get("/images/" + thisIs.modalImageId)
                    .then(function (res) {
                        thisIs.imageInModal = res.data.imageData;
                        thisIs.commentData = res.data.commentData;
                    })
                    .catch(function (err) {
                        console.log('Error at watch for "modalImageId": ', err);
                    });
            },
        },

        methods: {
            //this function emits a "close"-call tu main Vue instance so that modal can be closed through the according main instance method
            closeModal: function () {
                this.$emit("close");
            },
            sendCommentData: function (e) {
                e.preventDefault();
                //creates object for axios POST request
                let comment = {};
                comment.imageId = this.modalImageId;
                comment.comment = this.makeComment.comment;
                comment.username = this.makeComment.username;
                let thisIs = this;
                axios
                    .post("/comment", comment)
                    .then(function (res) {
                        let { success, ...newComment } = res.data;
                        console.log(
                            'POST "/comment" --> comment stored in DB successfully: ',
                            success
                        );
                        thisIs.commentData.unshift(newComment);
                    })
                    .then(function () {
                        thisIs.clearCommentFields();
                    })
                    .catch(function (err) {
                        console.log('ERROR in POST "/comment": ', err);
                    });
            },
            //Clearing input fields after commenting:
            clearCommentFields: function () {
                for (const each in this.makeComment) {
                    this.makeComment[each] = null;
                }
            },
        },
    });

    //Main Vue instance
    new Vue({
        el: ".main",
        data: {
            images: [],
            formDataObj: {
                title: null,
                description: null,
                username: null,
                file: null,
            },
            //location.hash.slice(1) --> makes the link available for sharing
            selectedImageId: location.hash.slice(1),
        },
        //as soon as the object with class ".photo" is loaded a GET call to "/images" is made to get image data from the database "images"
        mounted: function () {
            let thisIs = this;
            axios
                .get("/images")
                .then(function (res) {
                    console.log('get("/images") call --> done', res);
                    thisIs.images = res.data;
                })
                .catch((err) => {
                    console.log('ERROR in get("/images"): ', err);
                });

            window.addEventListener("hashchange", function () {
                console.log("hash change has fired: ", location.hash);
                //this function checks if the "location.hash" points to an existing image any time there is a change in the hash url
                //if there is no image data existing in the database to the location.hash, then this function causes "selectedImageId"
                //to be null, so that modal is closed if open, and location.hash will be deleted from url in address bar

                axios
                    .get("/check-image/" + location.hash.slice(1))
                    .then(function (res) {
                        if (res.data.imageExists) {
                            thisIs.selectedImageId = location.hash.slice(1);
                        } else {
                            console.log("window event listener --> no image");
                            thisIs.selectedImageId = null;
                            location.hash = "";
                        }
                    });
            });

            //Executes infinite scroll on page load
            setTimeout(this.scroll(), 1000);
        },

        methods: {
            //This method grabs the data from the input fields of the upload @change from the file-type input field of the form and stores it in the Vue "data" object
            uploadFormData: function (e) {
                this.formDataObj.file = e.target.files[0];
            },
            //This method sends the form data with an ajax call to the server
            sendFormData: function (e) {
                //Prevents refresh
                e.preventDefault();
                console.log(
                    '"Send"-Button was clicked, form data is: ',
                    this.formDataObj
                );

                var formData = new FormData();
                //Adding data to the formData object
                for (const each in this.formDataObj) {
                    formData.append(`${each}`, this.formDataObj[each]);
                }
                //Making "this" available inside axios call:
                let thisIs = this;
                // Ajax call with axios to post data --> connect server-side
                axios
                    .post("/upload", formData)
                    //if everything worked out over there, server sends us a response with the data we can pass to our Vue "data" property "images"
                    .then(function (res) {
                        let { success, ...newImage } = res.data;
                        console.log("Upload to AWS successful: ", success);
                        //Adding new image to the "data.images" property
                        thisIs.images.unshift(newImage);
                    })
                    //Clearing input fields after submission
                    .then(() => {
                        thisIs.clearInputFields();
                        console.log('POST "/upload"-call done');
                    })
                    .catch(function (err) {
                        console.log('Error from POST "/upload": ', err);
                    });
            },
            //Clearing input fields after submitting file:
            clearInputFields: function () {
                for (const each in this.formDataObj) {
                    this.formDataObj[each] = "";
                }
            },

            //Causes modal to be closed
            closeModal: function () {
                console.log("Parent: closeModal --> Modal closed");
                this.selectedImageId = null;
                location.hash = "";
            },

            scroll: function () {
                let thisIs = this;
                window.onscroll = function () {
                    //
                    console.log(
                        "document.documentElement.scrollTop ",
                        document.documentElement.scrollTop
                    );
                    console.log("window.innerHeight ", window.innerHeight);
                    console.log(
                        "document.documentElement.offsetHeight ",
                        document.documentElement.offsetHeight
                    );

                    if (
                        document.documentElement.scrollTop +
                            window.innerHeight >=
                        document.documentElement.offsetHeight
                    ) {
                        console.log("RELOAD");
                        //getting id of last image on screen:
                        if (thisIs.images.length) {
                            let indexOfLastElementOnScreen =
                                thisIs.images.length - 1;
                            let idOfLastElementOnScreen =
                                thisIs.images[indexOfLastElementOnScreen].id;
                            //calling for the next set of images
                            axios
                                .get(
                                    "/next-set-of-images/" +
                                        idOfLastElementOnScreen
                                )
                                .then(function (res) {
                                    if (res.data.success) {
                                        res.data.nextSetOfImages.forEach(
                                            (each) => thisIs.images.push(each)
                                        );
                                    }
                                })
                                .catch(function (err) {
                                    console.log(
                                        'ERROR at GET "/next-set-of-images/:id": ',
                                        err
                                    );
                                });
                        }
                    }
                };
            },
        },
    });
    //End of iefe
})();
