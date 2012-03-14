#pragma strict

var target : Transform;
var speed : float = 50.0;

function Start () {

}

function Update () {
   if (target)
   {
      transform.LookAt(target);
      // Move the object forward along its z axis 1 unit/second.
      transform.Translate(Vector3.forward * speed * Time.deltaTime);
      var dist : Vector3 = (transform.position - target.transform.position);
      if(dist.magnitude < 0.1)
      {
         Destroy(gameObject);
      }
   }
}