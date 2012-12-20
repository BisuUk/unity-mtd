#pragma strict
#pragma downcast

var range : float;
var spawnFX : Transform;

function Spawn()
{
   SpawnFX();

   var objectArray : GameObject[] = GameObject.FindGameObjectsWithTag("WASHABLE");
   // Order by distance position
   var objectList : List.<GameObject> = objectArray.OrderBy(function(x){return (x.transform.position-transform.position).magnitude;}).ToList();

   for (var obj : GameObject in objectList)
   {
      var affect : boolean = true;
      if (range > 0.0) // < 0 == infinite range
         affect = (obj.transform.position-transform.position).magnitude <= range;

      if (affect)
      {
         Destroy(obj, 0.1);
         Game.control.OnUseAbility();
         break;
      }
   }

   Destroy(gameObject, 0.1);
}

function Start()
{
   if (Network.isClient)
      SpawnFX();
   else
      Spawn();
}

function SpawnFX()
{
   if (spawnFX)
   {
      if (Network.isServer)
         Network.Instantiate(spawnFX, transform.position, Quaternion.identity, 0);
      else
         Instantiate(spawnFX, transform.position, Quaternion.identity);
   }
}