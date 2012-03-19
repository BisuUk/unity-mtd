#pragma strict
#pragma downcast

var playerObject : GameObject;
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

   // If there's a squad in the queue
   if (squads.Count > 0)
   {
      // Scroll the conveyer belt texture
      var offset : float = Time.time * 1.0;
      renderer.material.SetTextureOffset("_MainTex", Vector2(0,offset));

      // On emitrate interval
      if( Time.time > nextEmitTime )
      {
         var squad : UnitSquad = squads[0];
         var newUnit : GameObject;
         var prefabName : String = Unit.PrefabName(squad.sides);

         newUnit = Instantiate(Resources.Load(prefabName, GameObject), emitPosition.position, Quaternion.identity);
         newUnit.tag = "UNIT";
         newUnit.layer = 10;
         var newUnitScr : Unit = newUnit.AddComponent(Unit);
         newUnitScr.SetAttributes(squad);
         newUnitScr.squad = squad;
         newUnitScr.SetPath(path);
         newUnitScr.player = playerData;

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

      var prefabName : String = Unit.PrefabName(sel.sides);
      var cursorObject = Instantiate(Resources.Load(prefabName, GameObject), transform.position, Quaternion.identity);
      cursorObject.GetComponent(Collider).enabled = false;

      var cursorScript = cursorObject.AddComponent(Attack_CursorControl);
      cursorScript.squad = playerData.selectedSquad();
      cursorScript.isMouseCursor = false;


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