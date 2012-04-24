#pragma strict
#pragma downcast

import CustomWidgets;

var colorCircle : Texture2D;
var previewItemPos : Transform;
var textStyle : GUIStyle;

static var panelWidth : int = 200;
static var panelHeight = Screen.height;

private var previewItem : GameObject;
private var costValue : int = 0;
private var timeValue : float = 0;
private var idGenerator : int = 1;
private var squad : UnitSquad;
private var modifyingExisting : boolean = false;

static var selectedTypeButton : int = -1;
private var unitTypeStrings : String[] = ["1", "2", "3", "4", "5", "6"];

function Awake()
{
   panelWidth = Screen.width*0.20;
   squad = new UnitSquad();
}

function SetSquad(newSquad : UnitSquad)
{
   enabled = true;
   squad.Copy(newSquad);
   modifyingExisting = true;
   NewPreviewItem(squad.unitType);
}

function SetNew(unitType : int)
{
   enabled = true;
   squad.Initialize();  // Set base attr here
   squad.unitType = unitType;
   modifyingExisting = false;
   NewPreviewItem(squad.unitType);
}

function OnGUI()
{
   panelWidth = Screen.width*0.20;
   panelHeight = Screen.height;//*0.80;
   var previewHeight = Screen.height-panelHeight;

   // 3D Camera
   //GUIControl.previewCamera.camera.pixelRect = Rect(0, panelHeight, panelWidth, previewHeight);

   var panelRect : Rect = Rect(0, 0, panelWidth, panelHeight);

   GUI.Box(panelRect,"");

   GUILayout.BeginArea(panelRect);

      GUILayout.BeginVertical();

         // Button grid
         var newUnitTypeButton : int = GUILayout.SelectionGrid(selectedTypeButton, unitTypeStrings, 3, GUILayout.MinHeight(50));;
         if (newUnitTypeButton != selectedTypeButton)
         {
            GameData.player.selectedSquad = null;
            selectedTypeButton = newUnitTypeButton;
            selectedTypeButton = -1;
         }
         GUILayout.Space(5);

         // Size slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Size", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSize: float = GUILayout.HorizontalSlider(squad.size, 0.0, 1.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.size != newlySelectedSize)
               squad.size = newlySelectedSize;
         GUILayout.EndHorizontal();

         // Speed slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Spd", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSpeed: float = GUILayout.HorizontalSlider(squad.speed, 1.0, 5.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.speed != newlySelectedSpeed)
               squad.speed = newlySelectedSpeed;
         GUILayout.EndHorizontal();

         // Color Wheel
         var newlySelectedColor : Color = RGBCircle(squad.color, "", colorCircle);
         if (newlySelectedColor != squad.color)
            squad.color = newlySelectedColor;


         GUILayout.BeginHorizontal();
            if (GUILayout.Button(GUIContent("<", "Forward")))
            {
            }
            if (GUILayout.Button(GUIContent("Add", "AddToQueue")))
            {
            }
            if (GUILayout.Button(GUIContent(">", "Backward")))
            {
            }
         GUILayout.EndHorizontal();

         GUILayout.FlexibleSpace(); // push everything down

         // Cost
         textStyle.normal.textColor = ((-costValue) > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
         textStyle.fontSize = 30;
         GUILayout.Label(GUIContent((costValue<0 ? (-costValue).ToString() : "+"+costValue.ToString()), "Cost"), textStyle);

         // Time
         textStyle.normal.textColor = Color.white;
         textStyle.fontSize = 20;
         GUILayout.Label(GUIContent(timeValue.ToString("#.0")+"sec", "Time"), textStyle);


         if (GUILayout.Button(GUIContent("Launch", "Launch")))
         {
         }
/*
         GUILayout.Space(15);

         //textStyle.normal.textColor = Color(0.5,0.5,1.0);
         textStyle.normal.textColor = squad.color;
         textStyle.fontSize = 30;
         GUILayout.Label(GUIContent("x"+squad.count.ToString(), "Count"), textStyle);

         GUILayout.BeginHorizontal();
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

         GUILayout.FlexibleSpace(); // push everything down

         // Size slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Size", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSize: float = GUILayout.HorizontalSlider(squad.size, 0.0, 1.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.size != newlySelectedSize)
               squad.size = newlySelectedSize;
         GUILayout.EndHorizontal();

         // Speed slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Spd", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedSpeed: float = GUILayout.HorizontalSlider(squad.speed, 1.0, 5.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.speed != newlySelectedSpeed)
               squad.speed = newlySelectedSpeed;
         GUILayout.EndHorizontal();

         // Effect slider
         GUILayout.BeginHorizontal();
            GUILayout.Label("Eft", GUILayout.MinWidth(40), GUILayout.ExpandWidth(false));
            GUILayout.Space(5);
            var newlySelectedEffect : float = GUILayout.HorizontalSlider(squad.effect, 1.0, 5.0, GUILayout.ExpandWidth(true));
            GUILayout.Space(5);
            if (squad.effect != newlySelectedEffect)
               squad.effect = newlySelectedEffect;
         GUILayout.EndHorizontal();

         // Color Wheel
         var newlySelectedColor : Color = RGBCircle(squad.color, "", colorCircle);
         if (newlySelectedColor != squad.color)
            squad.color = newlySelectedColor;


         // Cost
         //if (costValue != 0)
         //{
            // Credits
            textStyle.normal.textColor = ((-costValue) > GameData.player.credits) ? Color.red : Color(0.2,1.0,0.2);
            textStyle.fontSize = 30;
            GUILayout.Label(GUIContent((costValue<0 ? (-costValue).ToString() : "+"+costValue.ToString()), "Cost"), textStyle);

            // Time
            textStyle.normal.textColor = Color.white;
            textStyle.fontSize = 20;
            GUILayout.Label(GUIContent(timeValue.ToString("#.0")+"sec", "Time"), textStyle);
         //}


         GUILayout.BeginHorizontal();

            if (modifyingExisting)
            {
               // Sell button
               if (!squad.deployed)
               {
                  if (GUILayout.Button(GUIContent("Sell", "SellButton")))
                  {
                     GameData.player.RemoveSquad(squad.id);
                     GameData.player.selectedSquad =  null;
                     enabled = false;
                  }
                  // Apply button
                  if (GUILayout.Button(GUIContent("Apply", "ApplyButton")))
                  {
                     // Check cost here.
   
                     GameData.player.selectedSquad.CopyAttributes(squad);
                     GUIControl.NewCursor(1, squad.unitType);
                  }
               }
            }
            else // New squad, not yet added to inv
            {
               // Add button
               if (GUILayout.Button(GUIContent("Add", "AddButton")))
               {
                  squad.owner = Network.player;
                  squad.id = idGenerator;
                  idGenerator += 1;

                  // Check cost here.

                  // Add squad to player inventory
                  GameData.player.selectedSquad = GameData.player.AddSquad(new UnitSquad(squad));
                  SetSquad(GameData.player.selectedSquad);

                  GUIControl.NewCursor(1, squad.unitType);
               }
            }
         GUILayout.EndHorizontal();
*/
      GUILayout.EndVertical();
   GUILayout.EndArea();
}

function OnEnable()
{
   GUIControl.previewCamera.camera.enabled = true;
}

function OnDisable()
{
   GUIControl.previewCamera.camera.enabled = false;
   DestroyPreviewItem();
}

function DestroyPreviewItem()
{
   if (previewItem)
   {
      for (var child : Transform in previewItem.transform)
         Destroy(child.gameObject);
      Destroy(previewItem);
   }
}

function NewPreviewItem(type : int)
{
   DestroyPreviewItem();

   if (type>0)
   {
      var prefabName : String = Unit.PrefabName(type);
      previewItem = Instantiate(Resources.Load(prefabName, GameObject), previewItemPos.position, Quaternion.identity);
      previewItem.GetComponent(Unit).enabled = false;
      previewItem.layer = 8; // 3D GUI layer
      previewItem.tag = "";
      previewItem.name = "AttackGUIPreviewItem";
      var pScr : AttackGUIPreviewItem = previewItem.AddComponent(AttackGUIPreviewItem);
      pScr.squad = squad;
   }
}
