#pragma strict
#pragma downcast

var emitPosition : Transform;
var followPath : Transform;
var emitRate : float;
var queueSquadCapacity : int;
private var path : List.<Vector3>;
private var squads : List.<UnitSquad>;
private var icons : List.<GameObject>;
private var nextEmitTime : float;
private var LR : LineRenderer;
private var LRColorPulseDuration : float = 0.1;

static private var playerData : PlayerData;

function Start()
{
   if (playerData == null)
   {
      var gameObj : GameObject = GameObject.Find("GameData");
      playerData = gameObj.GetComponent(PlayerData);
   }

   LR = transform.gameObject.GetComponent(LineRenderer);
   LR.SetWidth(0.3, 0.3);
   LR.enabled = false;

   squads = new List.<UnitSquad>();
   icons = new List.<GameObject>();

   path = new List.<Vector3>();
   if (followPath != null)
   {
      LR.SetVertexCount(followPath.childCount+2);
      LR.SetPosition(0, emitPosition.position);

      var tempTransforms = followPath.GetComponentsInChildren(Transform);
      var pathIndex = 1;
      for (var tr : Transform in tempTransforms)
      {
         if (tr != followPath.transform)
         {
            path.Add(tr.position);
            LR.SetPosition(pathIndex, tr.position);
            pathIndex++;
         }
      }

      var endPoint : GameObject = GameObject.Find("EndPoint");
      if (endPoint)
      {
         path.Add(endPoint.transform.position);
         LR.SetPosition(pathIndex, endPoint.transform.position);
      }
   }

   nextEmitTime = Time.time;
}

function Update ()
{
   // Flicker the path when mouseovered, (line renderer blows)
   if (LR.enabled)
   {
      var t : float = Mathf.PingPong (Time.time, LRColorPulseDuration) / LRColorPulseDuration;
      var c : Color = Color.Lerp (Color.yellow, Color.blue, t);
      LR.SetColors(c, c);
   }

   // If there's a squad in the queue
   if (squads.Count > 0)
   {
      // Scroll the conveyer belt texture
      var offset : float = Time.time * 1.0;
      renderer.material.SetTextureOffset("_MainTex", Vector2(0,offset));

      var front : Vector3 = transform.position;
      var squadIconSize = 2.5;
      front += (transform.forward * transform.localScale.z/2);
      front.y += 0.5;
      for (var go : GameObject in icons)
      {
         go.transform.position = front;
         front += (transform.forward * -squadIconSize);
      }

      // On emitrate interval
      if( Time.time > nextEmitTime )
      {
         var squad : UnitSquad = squads[0];
         var newUnit : GameObject;
         var prefabName : String = Unit.PrefabName(squad.unitType);

         //newUnit = Instantiate(Resources.Load(prefabName, GameObject), emitPosition.position, Quaternion.identity);
         newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), emitPosition.position, Quaternion.identity, 0);
         var newUnitScr : Unit = newUnit.GetComponent(Unit);
         newUnitScr.SetAttributes(squad);
         newUnitScr.squadID = squad.id;
         newUnitScr.SetPath(path);
         newUnitScr.player = playerData;

         newUnit.GetComponent(NetworkView).enabled = true;

         squad.deployUnit();
         if (squad.unitsToDeploy == 0)
         {
            squads.RemoveAt(0);
            Destroy(icons[0]);
            icons.RemoveAt(0);
         }

         nextEmitTime = Time.time + emitRate;
      }
   }
}

function OnMouseDown()
{
   if (squads.Count < queueSquadCapacity)
   {
      var sel : UnitSquad = playerData.selectedSquad();
      if (sel && !sel.deployed)
      {
         //var newSquad : UnitSquad = new UnitSquad(sel);
         sel.deployed = true;
         sel.unitsToDeploy = sel.count;
         squads.Add(sel);
   
         // Create and icon on the emitter platform
         var prefabName : String = Unit.PrefabName(sel.unitType);
         var iconObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
         iconObject.GetComponent(Collider).enabled = false;
         var iconScript = iconObject.AddComponent(AttackGUICursorControl);
         iconScript.squad = sel;
         iconScript.pulsate = false;
         iconScript.isMouseCursor = false;
         icons.Add(iconObject);
   
         renderer.material.color = Color.green;
         // Deselect current squad
         playerData.selectedSquadID = -1;
      }
   }
}

function OnMouseEnter()
{
   if (squads.Count >= queueSquadCapacity)
      renderer.material.color = Color.red;
   //Debug.Log("ONMOUSEENTER");
}

function OnMouseExit()
{

   renderer.material.color = Color.white;
}
