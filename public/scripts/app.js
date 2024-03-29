$(() => {

  //edit profile pages
  $("#edit-name").click(function() {
    $(".user-name-input").toggle(400);
  });
  $("#edit-email").click(function() {
    $(".user-email-input").toggle(400);
  });
  $("#edit-password").click(function() {
    $(".user-password-input").toggle(400);
  });

  //likes
  $(".fa-heart").click(function() {
    if ($(this).hasClass("not-liked")) {
      $.ajax({
        method: "POST",
        url: `/api/resources/${this.id}/likes`
      }).done(data => {
        $(`#${this.id}`)
          .siblings()
          .text(data.number_of_likes);
        $(`#${this.id}`)
          .removeClass("not-liked")
          .addClass("liked");
      });
    } else if ($(this).hasClass("liked")) {
      $.ajax({
        method: "POST",
        url: `/api/resources/${this.id}/likes/delete`
      }).done(data => {
        $(`#${this.id}`)
          .siblings()
          .text(data.number_of_likes);
        $(`#${this.id}`)
          .removeClass("liked")
          .addClass("not-liked");
      });
    }
  });
});
