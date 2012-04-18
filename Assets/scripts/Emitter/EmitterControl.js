#pragma strict
#pragma downcast

var emitPosition : Transform;
var followPath : Transform;
var emitRate : float;
var queueSquadCapacity : int;
var netView : NetworkView;
private var queueSquadCount : int;
private var path : List.<Vector3>;
private var squads : List.<UnitSquad>;
private var icons : List.<GameObject>;
private var nextEmitTime : float;
private var LR : LineRenderer;
private var LRColorPulseDuration : float = 0.1;

function Start()
{
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

function Update()
{
   // Flicker the path when mouseovered, (line renderer blows)
   if (LR.enabled)
   {
      var t : float = Mathf.PingPong (Time.time, LRColorPulseDuration) / LRColorPulseDuration;
      var c : Color = Color.Lerp (Color.yellow, Color.blue, t);
      LR.SetColors(c, c);
   }

   // If there's a squad in the queue
   if (queueSquadCount > 0)
   {
      // Scroll the conveyer belt texture
      var offset : float = Time.time * 1.0;
      renderer.material.SetTextureOffset("_MainTex", Vector2(0,offset));

      // Place queued squad icons accordingly
      var front : Vector3 = transform.position;
      var squadIconSize = 2.5;
      front += (transform.forward * transform.localScale.z/2);
      front.y += 0.5;
      for (var go : GameObject in icons)
      {
         go.transform.position = front;
         front += (transform.forward * -squadIconSize);
      }

      // Server handles when it is time to emit a unit
      if( (Network.isServer || GameData.hostType==0) && Time.time > nextEmitTime )
      {
         var squad : UnitSquad = squads[0];
         var newUnit : GameObject;
         var prefabName : String = Unit.PrefabName(squad.unitType);

         //newUnit = Instantiate(Resources.Load(prefabName, GameObject), emitPosition.position, Quaternion.identity);
         if (GameData.hostType > 0)
            newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), emitPosition.position, Quaternion.identity, 0);
          else
            newUnit = Instantiate(Resources.Load(prefabName, GameObject), emitPosition.position, Quaternion.identity);
         var newUnitScr : Unit = newUnit.GetComponent(Unit);
         newUnitScr.owner = squad.owner;
         newUnitScr.squad = squad;
         newUnitScr.squadID = squad.id;
         newUnitScr.SetAttributes(squad);
         newUnitScr.SetPath(path);

         if (GameData.hostType > 0)
            netView.RPC("DeployUnit", RPCMode.All, squad.owner, squad.id);
         else
            DeployUnit(squad.owner, squad.id);

         squad.deployUnit();
         if (squad.unitsToDeploy == 0)
         {
            if (GameData.hostType > 0)
               netView.RPC("DequeueSquad", RPCMode.AllBuffered);
            else
               DequeueSquad();
         }

         nextEmitTime = Time.time + emitRate;
      }
   }
}


@RPC
function DeployUnit(owner : NetworkPlayer, squadID : int)
{
   if (icons.Count > 0)
      icons[0].GetComponent(AttackGUICursorControl).indexNumber -= 1;
   if (owner == Network.player || GameData.hostType==0)
   {
      var squad : UnitSquad = GameData.player.GetSquadByID(squadID);
      squad.deployUnit();
   }
}


@RPC
function DequeueSquad()
{
   queueSquadCount -= 1;
   // Server adds removes squad data
   if(Network.isServer || GameData.hostType==0)
      squads.RemoveAt(0);
   Destroy(icons[0]);
   icons.RemoveAt(0);
}

@RPC
function EnqueueSquad(id : int, unitType : int, size : float, speed : float, effect : float, count : int, colorRed : float, colorGreen : float, colorBlue : float, info : NetworkMessageInfo )
{
   var squad : UnitSquad = new UnitSquad(id, unitType, size, speed, effect, count, Color(colorRed, colorGreen, colorBlue));
   squad.owner = info.sender;
   squad.count = count;
   squad.unitsToDeploy = count;

   // Create and icon on the emitter platform
   var prefabName : String = Unit.PrefabName(unitType);
   var iconObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);
   iconObject.GetComponent(Unit).enabled = false;
   iconObject.GetComponent(Collider).enabled = false;
   var iconScript = iconObject.AddComponent(AttackGUICursorControl);
   iconScript.indexNumber = count;
   iconScript.pulsate = false;
   iconScript.isMouseCursor = false;
   iconScript.setFromSquad(squad);
   icons.Add(iconObject);
   // Server adds squad data
   if(Network.isServer || GameData.hostType==0)
      squads.Add(squad);
   queueSquadCount += 1;
}


function OnMouseDown()
{
   if (queueSquadCount < queueSquadCapacity)
   {
      var sel : UnitSquad = GameData.player.selectedSquad;
      if (sel && !sel.deployed)
      {
         //var newSquad : UnitSquad = new UnitSquad(sel);
         sel.deployed = true;
         sel.unitsToDeploy = sel.count;

         if (GameData.hostType > 0)
            netView.RPC("EnqueueSquad", RPCMode.AllBuffered, sel.id, sel.unitType, sel.size, sel.speed, sel.effect, sel.count, sel.color.r, sel.color.g, sel.color.b);
         else
            EnqueueSquad(sel.id, sel.unitType, sel.size, sel.speed, sel.effect, sel.count, sel.color.r, sel.color.g, sel.color.b, new NetworkMessageInfo());

         renderer.material.color = Color.green;
         // Deselect current squad
         GameData.player.selectedSquad = null;
         GUIControl.Reset();
      }
   }
}

function OnMouseEnter()
{
   if (queueSquadCount >= queueSquadCapacity)
      renderer.material.color = Color.red;
   //Debug.Log("ONMOUSEENTER");
}

function OnMouseExit()
{

   renderer.material.color = Color.white;
}
