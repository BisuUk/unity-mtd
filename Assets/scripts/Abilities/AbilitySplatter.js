#pragma strict
#pragma downcast

var splatterPrefab : Transform;

function Start()
{
   Spawn();
}

function Spawn()
{
/*
   // Spawn splat with a little offset
   var randRange : float = 10.0;
   var rand : Vector3 = (Vector3(Random.Range(-randRange, randRange), 0, Random.Range(-randRange, randRange)));
   var randRot : Quaternion;
   randRot.eulerAngles = Vector3(0, Random.Range(0, 360), 0);

   var splat : Transform = Instantiate(splatterPrefab, transform.position, randRot);
   // Set color to be alpha'd out
   var c : Color = actualColor;
   c.a = 0;
   // Copy material, projectors use 'shared' materials
   var projector : Projector = splat.FindChild("Projector").GetComponent(Projector);
   var newMat : Material = new Material(projector.material);
   newMat.SetColor("_TintColor", c);
   projector.material = newMat;

*/
   // set effect action based on color

   // Disable collider on client?
   //if (Network.isClient)
   //{
   //}
}