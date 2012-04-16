#pragma strict
#pragma downcast

import CustomWidgets;

var squad : UnitSquad;

var panelHeightPercent : float = 0.25;
var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;

static var selectedCount : int = 0;
static var selectedSize  : float = 0.0;
static var selectedSpeed  : float = 0.0;
static var selectedEffect : float = 0.0;
static var selectedColor : Color = Color.white;
static var selectedUnitType : int = 0;
static var panelWidth : int = 200;
static var panelHeight = Screen.height;

private var squadCountStrings : String[] = ["5-", "-", "+", "5+"];
private var cursorObject : GameObject;
private var previewItem : GameObject;
private var lastSelSquadID : int = -1;
private var costValue : int = 0;
private var timeValue : float = 0;
private var idGenerator : int = 1;


function Awake()
{
   selectedColor = Color.white;
   selectedSize  = 0;
   selectedUnitType = 8;
   selectedCount = 1;
   panelWidth = Screen.width*0.20;
}


function OnGUI()
{
   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height;
   var panelRect : Rect = Rect(0, 0, panelWidth, panelHeight);

   GUI.Box(panelRect,"");

   // 3D Camera
   GUIControl.previewCamera.camera.enabled = true;
   GUIControl.previewCamera.camera.pixelRect = Rect(10, panelHeight-(panelHeight*0.20)-10, panelWidth*0.90, panelHeight*0.20);

   GUILayout.BeginArea(panelRect);
      GUILayout.Space(panelHeight*0.20);
      GUILayout.BeginVertical();
         GUILayout.FlexibleSpace(); // push everything down
         GUILayout.Space(15);

         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            var squadCountDelta : int = 0;

            if (GUILayout.Button(GUIContent("5-", "MinusFive")))
               squadCountDelta = -5;
            if (GUILayout.Button(GUIContent("-", "Minus")))
               squadCountDelta = -1;
            if (GUILayout.Button(GUIContent("+", "Plus")))
               squadCountDelta = 1;
            if (GUILayout.Button(GUIContent("5+", "PlusFive")))
               squadCountDelta = (squad.count==1) ? 4 : 5;

            if (squadCountDelta != 0)
            {
               squad.count += squadCountDelta;
               if (squad.count < 1)
                  squad.count = 1;
            }
         GUILayout.EndHorizontal();

         GUILayout.Space(5);
/*
         // Squad count buttons
         var newlySelectedCount : int = GUILayout.SelectionGrid(-1, squadCountStrings, 4);
         var addAmount = 0;
         switch (newlySelectedCount)
         {
            // -5
            case 0: addAmount = -5; break;
            case 1: addAmount = -1; break;
            case 2: addAmount = 1; break;
            case 3: addAmount = (selSquad.count==1) ? 4 : 5; break;
         }

*/
         // Size slider
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            GUILayout.Label("Size", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSize: float = GUILayout.HorizontalSlider(selectedSize, 1.0, 3.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedSize != newlySelectedSize)
            {
               selectedSize = newlySelectedSize;
            }
         GUILayout.EndHorizontal();

         // Speed slider
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            GUILayout.Label("Spd", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSpeed: float = GUILayout.HorizontalSlider(selectedSpeed, 1.0, 5.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedSpeed != newlySelectedSpeed)
            {
               selectedSpeed = newlySelectedSpeed;
            }
         GUILayout.EndHorizontal();

         // Effect slider
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            GUILayout.Label("Eft", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedEffect : float = GUILayout.HorizontalSlider(selectedEffect, 1.0, 5.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (selectedEffect != newlySelectedEffect)
            {
               selectedEffect = newlySelectedEffect;
            }
         GUILayout.EndHorizontal();

         // Color Wheel
         GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
            var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
            if (newlySelectedColor != selectedColor)
            {
               selectedColor = newlySelectedColor;
            }
         GUILayout.EndHorizontal();

         // Cost
         //if (costValue != 0)
         //{
            // Credits
            GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
               textStyle.normal.textColor = ((-costValue) > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
               textStyle.fontSize = 30;
               GUILayout.Label(GUIContent((costValue<0 ? (-costValue).ToString() : "+"+costValue.ToString()), "Cost"), textStyle);
            GUILayout.EndHorizontal();

            // Time
            GUILayout.BeginHorizontal(GUILayout.Width(panelWidth));
               textStyle.normal.textColor = Color.white;
               textStyle.fontSize = 20;
               GUILayout.Label(GUIContent(timeValue.ToString("#.0")+"sec", "Time"), textStyle);
            GUILayout.EndHorizontal();
         //}


         GUILayout.BeginHorizontal();

            // Sell button
            if (GUILayout.Button(GUIContent("Sell", "SellButton")))
            {
            }

            // Apply button
            if (GUILayout.Button(GUIContent("Add", "ApplyButton")))
            {
               // Reinit controls
               selectedUnitType = 8;
               selectedSize = 0;
               selectedColor = Color.white;

               squad.owner = Network.player;
               squad.id = idGenerator;
               idGenerator += 1;
               // Add squad to player inventory
               GameData.player.AddSquad(squad);
               GameData.player.selectedSquad = squad;
            }
         GUILayout.EndHorizontal();


      GUILayout.EndVertical();
   GUILayout.EndArea();


/*
   panelHeight = Screen.height*panelHeightPercent;
   var xOffset : int = panelHeight;
   var yOffset : int = Screen.height-panelHeight;
   var selSquad : UnitSquad = GameData.player.selectedSquad;
   var e : Event = Event.current;

   if (selSquad)
   {
      selectedCount = selSquad.count; // Cursor will reference this

      // If we selected a new squad, load new preview and cursor
      if (lastSelSquadID != selSquad.id)
      {
         NewPreviewItem(selSquad.unitType);
      }

      lastSelSquadID = selSquad.id;
   }
   else if (lastSelSquadID != -1)
   {
      lastSelSquadID = -1;
      NewPreviewItem(0);
      pulsateScale = 0;
   }

   // Color wheel
   GUILayout.BeginArea(Rect(0, yOffset, panelHeight, panelHeight));
      selectedColor = (selSquad) ? selSquad.color : Color.white;
      var newlySelectedColor : Color = RGBCircle(selectedColor, "", colorCircle);
      if (selSquad && !selSquad.deployed)
      {
         selectedColor = newlySelectedColor;
         selSquad.color = selectedColor;
         if (cursorObject)
            cursorObject.GetComponent(AttackGUICursorControl).color = selectedColor;
      }
   GUILayout.EndArea();

   // Size slider
   xOffset += 160;
   selectedSize = (selSquad) ? selSquad.size : 0;
   var newlySelectedSize : float = GUI.VerticalSlider(Rect(xOffset, yOffset+10, 30, panelHeight-20), selectedSize, 0.5, 0.0);
   if (selSquad && !selSquad.deployed)
   {
      selectedSize = newlySelectedSize;
      selSquad.size = selectedSize;
   }

   // Move 3D preview camera to be in correct location on the GUI
   xOffset += 20;
   GUIControl.previewCamera.camera.pixelRect = Rect(xOffset, 10, 180, panelHeight-20);

   // Squad controls
   xOffset += 190;
   GUILayout.BeginArea(Rect(xOffset, yOffset, 50, panelHeight));
      GUILayout.BeginVertical("box", GUILayout.Height(panelHeight));
         if (GUILayout.Button("New", GUILayout.Height(panelHeight/4.8)))
         {
            // Reinit controls
            selectedUnitType = 8;
            selectedSize = 0;
            selectedColor = Color.white;

            var newSquad = new UnitSquad(idGenerator, selectedUnitType, selectedSize, selectedColor);
            newSquad.owner = Network.player;

            idGenerator += 1;
            // Add squad to player inventory
            GameData.player.AddSquad(newSquad);
            GameData.player.selectedSquad = newSquad;
         }
         if (GUILayout.Button("Del", GUILayout.Height(panelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               GameData.player.RemoveSquad(selSquad.id);
               selectedColor = Color.white;
               NewPreviewItem(0);
            }
         }
         if (GUILayout.Button("+", GUILayout.Height(panelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               var addAmount = (e.shift) ? ((selSquad.count==1) ? 4 : 5) : 1;
               selSquad.count += addAmount;
            }
         }
         if (GUILayout.Button("-", GUILayout.Height(panelHeight/4.8)))
         {
            if (selSquad && !selSquad.deployed)
            {
               selSquad.count += (e.shift) ? -5 : -1;
               if (cursorObject)
                  cursorObject.GetComponent(AttackGUICursorControl).indexNumber += (e.shift) ? -5 : -1;

            }
         }
      GUILayout.EndVertical();
   GUILayout.EndArea();




// COMMENT
   // If we don't click on anything, unselect squad
   if (selSquad && e.type == EventType.MouseDown && e.isMouse && e.button == 0)
   {
      //Debug.Log("mouseY= "+Input.mousePosition.y+" screenY="+Screen.height);
      // Make sure the mouse is out over the map.
      if (Input.mousePosition.y > panelHeight)
      {
         var hit : RaycastHit;
         var mask = 1 << 10;
         var ray : Ray = Camera.main.ScreenPointToRay(Input.mousePosition);
         if (!Physics.Raycast(ray.origin, ray.direction, hit, Mathf.Infinity, mask ))
            GameData.player.selectedSquadID = -1;
      }
   }
*/
}



function NewPreviewItem(sides : int)
{
   if (previewItem)
   {
      for (var child : Transform in previewItem.transform)
         Destroy(child.gameObject);
      Destroy(previewItem);
   }
   if (sides>0)
   {
      var prefabName : String = Unit.PrefabName(sides);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.GetComponent(Unit).enabled = false;
      previewItem.layer = 8; // 3D GUI layer
      previewItem.tag = "";
      previewItem.name = "AttackGUIPreviewItem";

      previewItem.AddComponent(AttackGUIPreviewItem);
   }
}
