#pragma strict
#pragma downcast

var leapPosition : Transform;
var emitPosition : Transform;
var splashPosition : Transform;
var followPath : Transform;
var countDown : Transform;
var launchSpeed : float;
var launchSpeedLimits : Vector2;
var autoLaunch : boolean;
var speedCostMult : float;
var speedTimeCostMult : float;
var color : Color;
var launchTime : float = 0.0;
var unitQueue : List.<UnitAttributes>;
var path : List.<Vector3>;
var netView : NetworkView;

private var queueCount : int;
//private var LR : LineRenderer;
//private var LRColorPulseDuration : float = 0.1;
private var nextUnitLaunchTime : float;
private var unitLaunchTimeSpacing: float = 0.5;
private var launchQueue : List.<UnitAttributes>;
private var previewUnits : List.<Unit>;
private var isSelected : boolean;
private var launchingQueue : boolean;

function Awake()
{
   // Detach GUI text because rotating parented GUI text
   // gets all sheared and fucked up for some reason...
   // I'm sure it's some mathy bullshit.
   countDown.transform.parent = null;
   launchTime = 0.0;
   unitQueue = new List.<UnitAttributes>();
   launchQueue = new List.<UnitAttributes>();
   previewUnits = new List.<Unit>();
   isSelected = false;
   color = Color.white;
   Reset();
   SetPreviewUnitsVisible(false);
   launchingQueue = false;
}

function Start()
{
   //LR = transform.gameObject.GetComponent(LineRenderer);
   //LR.SetWidth(0.3, 0.3);
   //LR.enabled = false;

   // Parse path for this emitter
   path = new List.<Vector3>();
   if (followPath != null)
   {
      //LR.SetVertexCount(followPath.childCount+2);
      //LR.SetPosition(0, emitPosition.position);

      var tempTransforms = followPath.GetComponentsInChildren(Transform);
      var pathIndex = 1;
      path.Add(emitPosition.position);
      for (var tr : Transform in tempTransforms)
      {
         if (tr != followPath.transform)
         {
            path.Add(tr.position);
            //LR.SetPosition(pathIndex, tr.position);
            pathIndex++;
         }
      }
      // Add on endpoint
      var endPoint : GameObject = GameObject.Find("EndPoint");
      if (endPoint)
      {
         path.Add(endPoint.transform.position);
         //LR.SetPosition(pathIndex, endPoint.transform.position);
      }
   }
}

function Update()
{
   // Check if selected state changed
   if (Game.player && (Game.player.selectedEmitter == transform.gameObject) != isSelected)
      SetSelected(!isSelected);

   // Flicker the path when mouseovered, (line renderer blows)
   //if (LR && LR.enabled)
   //{
   //   var t : float = Mathf.PingPong (Time.time, LRColorPulseDuration) / LRColorPulseDuration;
   //   var c : Color = Color.Lerp (Color.yellow, Color.blue, t);
   //   LR.SetColors(c, c);
   //}
/*
   // Countdown to launch initiated
   if (launchTime > 0.0)
   {
      if (Network.isServer || Game.hostType==0)
      {
         // Check for time expired
         if (Time.time >= launchTime)
            SetLaunchDuration(0.0);
      }

      // Scroll the conveyer belt texture
      //var offset : float = Time.time * 1.0;
      //renderer.material.SetTextureOffset("_MainTex", Vector2(0,offset));

      // Show count down
      countDown.renderer.enabled = true;
      var timeLeft : float = (launchTime - Time.time);
      if (timeLeft <= 0.0)
         timeLeft = 0.0;
      //Mathf.FloorToInt(launchTime - Time.time + 1.0).ToString();
      countDown.GetComponent(TextMesh).text = timeLeft.ToString("#0.0");;
   }
*/

   if (launchingQueue)
   {
      if (Time.time >= nextUnitLaunchTime)
         LaunchQueueUnit();
   }
   else // Launch time expired, for clients
   {
      if (autoLaunch)
         Launch();
      countDown.renderer.enabled = false;
   }
}

function OnMouseDown()
{
   // Select here, NOTE: Update() will call SetSelected
   if (Game.player.isAttacker)
      Game.player.selectedEmitter = transform.gameObject;
}

function Reset()
{
   unitQueue.Clear();
   DestroyPreviewUnits();

   color = Color.white;

   var ua : UnitAttributes = new UnitAttributes();
   ua.unitType = 0;
   ua.size = 0.0;
   ua.strength = 0.0;
   ua.color = Color.white;
   AddToQueue(ua);

   ResyncPreviewUnits();
}

function LaunchQueueUnit()
{
   if ((Network.isServer || Game.hostType==0))
   {
      // Server handles when it is time to emit units
      var newUnit : GameObject;
      var launchStart : Vector3 = leapPosition.position;
      var squadID : int = Utility.GetUniqueID();
      // Start launch countdown
      //SetLaunchDuration(duration);

      // Spawn units in queue

      if (launchQueue.Count > 0)
      {
         var unitAttr : UnitAttributes = launchQueue[0];
         var prefabName : String = Unit.PrefabName(unitAttr.unitType);

         if (Game.hostType > 0)
            newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity, 0);
         else
            newUnit = Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity);

         //unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, speed);
         //unitAttr.speed = (launchSlowly) ? launchSpeedLimits.x : launchSpeedLimits.y;
         unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, launchSpeed);

         var newUnitScr : Unit = newUnit.GetComponent(Unit);
         newUnitScr.ID = Utility.GetUniqueID();
         newUnitScr.squadID = squadID;
         newUnitScr.emitter = this;
         newUnitScr.SetPath(path);
         newUnitScr.SetAttributes(unitAttr);
         // Send attributes to client so it can calculate FX like radii etc.
         if (Network.isServer)
         {
            newUnitScr.netView.RPC("ClientSetAttributes", RPCMode.Others,
               unitAttr.unitType, unitAttr.size, unitAttr.speed, unitAttr.strength,
               unitAttr.color.r, unitAttr.color.g, unitAttr.color.b, netView.viewID);
         }

         launchQueue.RemoveAt(0);
         nextUnitLaunchTime = Time.time + unitLaunchTimeSpacing + (unitLaunchTimeSpacing*unitAttr.strength*2.0);
      }
      else
      {
         launchingQueue = false;
         nextUnitLaunchTime = Time.time;
      }

   }
}


@RPC
function SendLaunchUnitAttributes(newUnitType : int, newSize  : float, newSpeed : float, newStrength : float, colorRed : float, colorGreen : float, colorBlue : float)
{
   if (!launchingQueue)
   {
      var ua : UnitAttributes = new UnitAttributes();
      ua.unitType = newUnitType;
      ua.size = newSize;
      //ua.speed = newSpeed // Set by launcher
      ua.strength = newStrength;
      ua.color = Color(colorRed, colorGreen, colorBlue);

      launchQueue.Add(ua);
   }
}

@RPC
function SetLaunchDuration(duration : float)
{
   if (Network.isServer)
      netView.RPC("SetLaunchDuration", RPCMode.Others, duration);

   // If we're setting duration to zero, just set no launch time
   if (duration == 0.0)
      launchTime = 0.0;
   else
      launchTime = Time.time + duration;
}
/*
@RPC
function LaunchUnits(speed : float, duration : float)
{
   if ((Network.isServer || Game.hostType==0))
   {
      // Server handles when it is time to emit units
      var newUnit : GameObject;
      var launchStart : Vector3 = leapPosition.position;
      var squadID : int = Utility.GetUniqueID();
      // Start launch countdown
      //SetLaunchDuration(duration);

      // This launch squad will only go as fast as the slowest unit
      var slowestSpeed : float = Mathf.Infinity;
      for (var unitAttr : UnitAttributes in launchQueue)
      {
         if ((1.0-unitAttr.strength) < slowestSpeed)
            slowestSpeed = (1.0-unitAttr.strength);
      }

      // Spawn units in queue
      for (var unitAttr : UnitAttributes in launchQueue)
      {
         var prefabName : String = Unit.PrefabName(unitAttr.unitType);

         if (Game.hostType > 0)
            newUnit = Network.Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity, 0);
         else
            newUnit = Instantiate(Resources.Load(prefabName, GameObject), launchStart, Quaternion.identity);

         //unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, speed);
         //unitAttr.speed = (launchSlowly) ? launchSpeedLimits.x : launchSpeedLimits.y;
         unitAttr.speed = Mathf.Lerp(launchSpeedLimits.x, launchSpeedLimits.y, slowestSpeed);

         var newUnitScr : Unit = newUnit.GetComponent(Unit);
         newUnitScr.ID = Utility.GetUniqueID();
         newUnitScr.squadID = squadID;
         newUnitScr.emitter = this;
         newUnitScr.SetPath(path);
         newUnitScr.SetAttributes(unitAttr);
         // Send attributes to client so it can calculate FX like radii etc.
         if (Network.isServer)
         {
            newUnitScr.netView.RPC("ClientSetAttributes", RPCMode.Others,
               unitAttr.unitType, unitAttr.size, unitAttr.speed, unitAttr.strength,
               unitAttr.color.r, unitAttr.color.g, unitAttr.color.b, netView.viewID);
         }
         // Move start point back for next unit
         launchStart += (transform.forward * -newUnit.transform.localScale.x*0.5);
         newUnit.transform.position = launchStart;
         launchStart += (transform.forward * -newUnit.transform.localScale.x*0.5);
         launchStart += (transform.forward * -0.1);
      }

      // Clear launch queue
      launchQueue.Clear();
   }
}
*/



function Launch()
{
   if (!launchingQueue)
   {
      var costValue : float = GetCost();
      if (costValue <= Game.player.credits)
      {
         // NOTE: Client is calculating cost, unsecure.
         Game.player.credits -= costValue;

         if (Network.isServer || (Game.hostType==0))
         {
            // Copy units to launchQueue
            var slowestSpeed : float = Mathf.Infinity;
            for (var ua : UnitAttributes in unitQueue)
            {
               // This launch squad will only go as fast as the slowest unit
               if ((1.0-ua.strength) < slowestSpeed)
                  slowestSpeed = (1.0-ua.strength);
               launchQueue.Add(ua);
            }
            launchSpeed = slowestSpeed;
            launchingQueue = true;
            // Spawn units on emitter
            //LaunchUnits(launchSpeed, GetTimeCost());
         }
         else // Clients send
         {
            // Send unit attributes to server, one by one
            for (var ua : UnitAttributes in unitQueue)
            {
               netView.RPC("SendLaunchUnitAttributes", RPCMode.Server,
                  ua.unitType, ua.size, ua.speed, ua.strength, ua.color.r, ua.color.g, ua.color.b);
            }
            // Tell server to spawn units
            // NOTE: Client is calculating launch time, unsecure.
            netView.RPC("LaunchUnits", RPCMode.Server, launchSpeed, GetTimeCost());
         }
      }
   }
}

function AddToQueue(ua : UnitAttributes)
{
   unitQueue.Add(ua);
   ua.color = color;
   SpawnPreviewUnit((unitQueue.Count > 0) ? unitQueue.Count-1 : 0, ua);
}

function InsertIntoQueue(index : int, ua : UnitAttributes)
{
   unitQueue.Insert(index, ua);
   ua.color = color;
   //SpawnPreviewUnit(index, ua);
   ResyncPreviewUnits();
}

function RemoveFromQueue(index : int)
{
   if (index < 0 || index >= unitQueue.Count || unitQueue.Count == 1)
      return;

   unitQueue.RemoveAt(index);

   //previewUnits.RemoveAt(index);
   ResyncPreviewUnits();
}

function MoveInQueue(index : int, forward : boolean)
{
   var tempIndex : int = index;
   var temp : UnitAttributes = unitQueue[tempIndex];
   unitQueue.RemoveAt(tempIndex);
   //previewUnits.RemoveAt(tempIndex);
   tempIndex = (forward) ? tempIndex-1 : tempIndex+1;
   InsertIntoQueue(tempIndex, temp);
}

function SetAttributesForIndex(attributes : UnitAttributes, index : int)
{
   if (previewUnits.Count <= 0 || index < 0 || index >= previewUnits.Count)
      return;
   // New attributes specify new unit type
   if (attributes.unitType != previewUnits[index].unitType)
   {
      // Destroy existing prefab and create new model
      Destroy(previewUnits[index].gameObject);
      previewUnits.RemoveAt(index);
      SpawnPreviewUnit(index, attributes);
   }
   unitQueue[index].Copy(attributes);
   previewUnits[index].SetAttributes(attributes);
   RepositionPreviewUnits();
}

function GetCost() : int
{
   var total : int = 0;
   for (var u : Unit in previewUnits)
      total += u.Cost();
   return total*(Mathf.Lerp(1.0, speedCostMult, launchSpeed));
}

function GetTimeCost() : float
{
   var total : float = 0.0;
   for (var u : Unit in previewUnits)
      total += u.TimeCost();
   return total*(Mathf.Lerp(1.0, speedTimeCostMult, launchSpeed));
}

function SetColor(newColor : Color)
{
//Debug.Log("SetColor="+newColor);
   color = newColor;
   // Send unit attributes to server, one by one
   for (var ua : UnitAttributes in unitQueue)
      ua.color = color;

   for (var u : Unit in previewUnits)
      u.SetColor(color);
}

//-----------------------------------------------------------------------------
// PRIVATE FUNCTIONS
//-----------------------------------------------------------------------------

private function SetSelected(selected : boolean)
{
   // Called from Update
   isSelected = selected;
   SetPreviewUnitsVisible(isSelected);
   if (isSelected)
      GUIControl.attackGUI.attackPanel.SetNew(this);
}

private function SetPreviewUnitsVisible(visible : boolean)
{
   for (var u : Unit in previewUnits)
   {
      u.SetVisible(visible);
      u.gameObject.active = visible; // disables all  mouse collisions
      u.AOE.renderer.enabled = false;
   }
}

private function RepositionPreviewUnits()
{
   var launchStart : Vector3 = emitPosition.position;
   for (var u : Unit in previewUnits)
   {
      //var newUnitScr : Unit = go.GetComponent(Unit);
      // Move start point back for next unit
      launchStart += (transform.forward * -u.gameObject.transform.localScale.x*0.5);
      u.gameObject.transform.position = launchStart;
      launchStart += (transform.forward * -u.gameObject.transform.localScale.x*0.5);
      launchStart += (transform.forward * -0.1);
   }
}

private function ResyncPreviewUnits()
{
   DestroyPreviewUnits();
   var i : int = 0;
   for (var ua : UnitAttributes in unitQueue)
   {
      SpawnPreviewUnit(i, ua);
      i += 1;
   }
}

private function SpawnPreviewUnit(index : int, attributes : UnitAttributes)
{
   var prefabName : String = Unit.PrefabName(attributes.unitType);
   var newUnit : GameObject = Instantiate(Resources.Load(prefabName, GameObject), Vector3.zero, Quaternion.identity);

   var newUnitScr : Unit = newUnit.GetComponent(Unit);
   newUnitScr.SetAttributes(attributes);
   newUnitScr.ID = index;  // used in OnMouseDown
   newUnitScr.AOE.renderer.enabled = false;
   newUnit.AddComponent(AttackGUIPreviewUnit).attributes = attributes;
   newUnit.networkView.enabled = false;
   newUnit.transform.rotation = transform.rotation;
   // Add to list of preview units
   previewUnits.Insert(index, newUnitScr);
   // Ensure proper spacing between units
   RepositionPreviewUnits();
}

private function DestroyPreviewUnits()
{
   for (var u : Unit in previewUnits)
      Destroy(u.gameObject);
   previewUnits.Clear();
}
