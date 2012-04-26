#pragma strict
#pragma downcast

var emitPosition : Transform;
var followPath : Transform;
var countDown : Transform;
var launchSpeed : float = 1.0;
var launchTime : float = 0.0;
var unitQueue : List.<UnitAttributes>;
var netView : NetworkView;

private var queueCount : int;
private var path : List.<Vector3>;
private var LR : LineRenderer;
private var LRColorPulseDuration : float = 0.1;
private var nextEmitTime : float;
private var lastTime : int;

function Awake()
{
   // Detach GUI text because rotating parented GUI text
   // gets all sheared and fucked up for some reason...
   // I'm sure it's some mathy bullshit.
   countDown.transform.parent = null;
}

function Start()
{
   LR = transform.gameObject.GetComponent(LineRenderer);
   LR.SetWidth(0.3, 0.3);
   LR.enabled = false;

   unitQueue = new List.<UnitAttributes>();

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
   // selected
   if (GameData.player.selectedEmitter == transform.gameObject)
   {
      var pColor : Color = Color.yellow;
      pColor.a = GUIControl.colorPulsateValue;
      renderer.material.SetColor("_TintColor", pColor);
   }
   else
   {
      //Debug.Log("tint=" + renderer.material.GetColor("_TintColor"));
      renderer.material.SetColor("_TintColor", Color.gray);
   }

   // Flicker the path when mouseovered, (line renderer blows)
   if (LR.enabled)
   {
      var t : float = Mathf.PingPong (Time.time, LRColorPulseDuration) / LRColorPulseDuration;
      var c : Color = Color.Lerp (Color.yellow, Color.blue, t);
      LR.SetColors(c, c);
   }

   if (launchTime > 0.0)
   {
      // Scroll the conveyer belt texture
      var offset : float = Time.time * 1.0;
      renderer.material.SetTextureOffset("_MainTex", Vector2(0,offset));

      // Server handles when it is time to emit units
      if ( (Network.isServer || GameData.hostType==0) && Time.time >= launchTime)
      {


         var newUnit : GameObject;
         var launchStart : Vector3 = emitPosition.position;
         for (var unitAttr : UnitAttributes in unitQueue)
         {
            var prefabName : String = Unit.PrefabName(unitAttr.unitType);

            if (GameData.hostType > 0)
               newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity, 0);
             else
               newUnit = Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity);
            var newUnitScr : Unit = newUnit.GetComponent(Unit);
            newUnitScr.SetPath(path);
            unitAttr.speed = launchSpeed;
            newUnitScr.SetAttributes(unitAttr);
            launchStart += (transform.forward*-0.5);
         }

         //Debug.Log("GO TIME");
         launchTime = 0.0;
      }

      // Show count down
      countDown.renderer.enabled = true;
      countDown.GetComponent(TextMesh).text = Mathf.FloorToInt(launchTime - Time.time + 1.0).ToString();
   }
   else
   {
      countDown.renderer.enabled = false;
   }
}




function OnMouseDown()
{
   if (GameData.player.isAttacker)
   {
      GameData.player.selectedEmitter = transform.gameObject;
      GUIControl.attackGUI.attackPanel.SetNew(this);
   }

/*
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
*/
}

function OnMouseEnter()
{
   //if (queueSquadCount >= queueSquadCapacity)
   //   renderer.material.color = Color.red;
   //Debug.Log("ONMOUSEENTER");
}

function OnMouseExit()
{

   renderer.material.color = Color.white;
}
