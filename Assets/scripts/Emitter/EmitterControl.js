#pragma strict

var playerObject : GameObject;
var unitPrefab : Transform;
var emitPosition : Transform;
var followPath : Transform;
private var playerData : PlayerData;
private var path : List.<Vector3>;

function Start()
{
   if (playerObject)
      playerData = playerObject.GetComponent(PlayerData);

   var endPoint : GameObject = GameObject.Find("EndPoint");

   path = List.<Vector3>();
   if (followPath != null)
   {
      var tempTransforms = followPath.GetComponentsInChildren(Transform);
      for (var tr : Transform in tempTransforms)
      {
         if (tr != followPath.transform)
            path.Add(tr.position);
      }
      if (endPoint)
         path.Add(endPoint.transform.position);
   }
}

function Update ()
{
   // On rate interval
      // Check queue contents
      // Launch unit of squad type
      // if top squad count = 0
        // pop squad off queue
}

function OnMouseDown()
{
   if (playerData.selectedSquadID > -1)
   {
      var newUnitT : Transform;
      newUnitT = Instantiate(unitPrefab, emitPosition.position, Quaternion.identity);
      var newUnit : Unit = newUnitT.gameObject.GetComponent(Unit);
      newUnit.SetAttributes(playerData.selectedSquad());
      newUnit.SetPath(path);

      renderer.material.color = Color.green;
   }
}

function OnMouseEnter()
{
   renderer.material.color = Color.red;
   //Debug.Log("ONMOUSEENTER");
}

function OnMouseExit()
{
   renderer.material.color = Color.white;
}