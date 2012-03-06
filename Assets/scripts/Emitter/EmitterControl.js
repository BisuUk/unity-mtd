#pragma strict
#pragma downcast

var playerObject : GameObject;
var unitPrefab : Transform;
var emitPosition : Transform;
var followPath : Transform;
var emitRate : float;
private var playerData : PlayerData;
private var path : List.<Vector3>;
private var squads : List.<UnitSquad>;
private var nextEmitTime : float;

function Start()
{
   if (playerObject)
      playerData = playerObject.GetComponent(PlayerData);

   squads = new List.<UnitSquad>();

   path = new List.<Vector3>();
   if (followPath != null)
   {
      var tempTransforms = followPath.GetComponentsInChildren(Transform);
      for (var tr : Transform in tempTransforms)
      {
         if (tr != followPath.transform)
            path.Add(tr.position);
      }

      var endPoint : GameObject = GameObject.Find("EndPoint");
      if (endPoint)
         path.Add(endPoint.transform.position);
   }

   nextEmitTime = Time.time;
}

function Update ()
{
   // On emitrate interval
   if( Time.time > nextEmitTime )
   {
      // If there's a squad in the queue
      if (squads.Count > 0)
      {
         var squad : UnitSquad = squads[0];
         var newUnitT : Transform;
         newUnitT = Instantiate(unitPrefab, emitPosition.position, Quaternion.identity);
         var newUnit : Unit = newUnitT.gameObject.GetComponent(Unit);
         newUnit.SetAttributes(squad);
         newUnit.squad = squad;
         newUnit.SetPath(path);

         squad.deployUnit();
         if (squad.unitsToDeploy == 0)
            squads.RemoveAt(0);
            
         nextEmitTime = Time.time + emitRate;
      }
   }
}

function OnMouseDown()
{
   var sel : UnitSquad = playerData.selectedSquad();
   if (sel && !sel.deployed)
   {
      //var newSquad : UnitSquad = new UnitSquad(sel);
      sel.deployed = true;
      sel.unitsToDeploy = sel.count;
      squads.Add(sel);

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