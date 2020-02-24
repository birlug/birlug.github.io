---
permalink: /posts/
layout: post
title: پست ها
---

<div class="container">
  {% for site in site.data.posts %}
    <div class="row mb-5">
    <div class="col-md-4">
      <img class="img-thumbnail" src="{{site.src}}" alt="">
    </div>
    <div class="col-md-8 text-right mt-md-3">
      <h5>{{site.title}}</h5>
      <hr>
      <p>{{site.description}}</p>
      <hr >
      <div class="row justify-content-end">
        <a href="{{site.evandlink}}" class="btn btn-primary"> لینک ثبت نام</a>
      </div>
    </div>
  </div>
  {% endfor %}
</div>