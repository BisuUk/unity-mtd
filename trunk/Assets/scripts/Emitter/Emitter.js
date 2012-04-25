#pragma strict
#pragma downcast

var emitPosition : Transform;
var followPath : Transform;
var emitRate : float;
var queueSquadCapacity : int;
var netView : NetworkView;
var launchTime : float = 0.0;
var unitQueue : List.<UnitAttributes>;
var launchSpeed : float;

private var queueCount : int;
private var path : List.<Vector3>;
private var LR : LineRenderer;
private var LRColorPulseDuration : float = 0.1;
private var nextEmitTime : float;

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
   if (GUIControl.attackGUI.attackPanel.emitter == this)
   {
      var pColor : Color = Color.yellow;
      pColor.a = GUIControl.pulsateValue;
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

}




function OnMouseDown()
{
   GUIControl.attackGUI.attackPanel.SetNew(this);

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
